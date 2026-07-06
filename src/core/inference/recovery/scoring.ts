/**
 * RECOVERY MODEL v1 — Dimension Scoring
 *
 * Pure functions implementing the algorithmic specification from
 * RECOVERY_MODEL.md §5 (Algorithm Specification).
 *
 * Each function is deterministic and side-effect free.
 * All thresholds and multipliers are sourced from the specification
 * with the corresponding evidence level and citation.
 *
 * Function contracts:
 *   - Returns null when insufficient data (PENDING is treated as null)
 *   - Returns 0–100 for valid scores (integer after synthesis, float during computation)
 *   - Clamps output to [0, 100]
 */

import type { RecoveryFeatureSet, LoadFeatureSet } from '@/core/features/types';
import type { DimensionScore, ScoredDimensions } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 1 — Autonomic Score (HRV + RHR)
// RECOVERY_MODEL.md §5.1
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map HRV delta from 14-day personal baseline to AutonomicRaw (0–100).
 *
 * Thresholds (Plews et al. 2013, Buchheit 2014):
 *   ±5% = noise. Meaningful suppression begins at -10–15%.
 */
function mapHrvDeltaToAutonomicRaw(pct: number): number {
  if (pct > 10) return 100;
  if (pct > 5) return 90;
  if (pct > 0) return 80;
  if (pct > -5) return 70;
  if (pct > -10) return 55;
  if (pct > -15) return 40;
  if (pct > -25) return 25;
  return 10;
}

/**
 * Fallback when HRV delta is unavailable: use absolute RMSSD with
 * population-level norms (less personalized → lower confidence).
 * Only used when baseline cannot be established.
 */
function mapHrvAbsoluteToAutonomicRaw(rmssd: number): number {
  if (rmssd >= 60) return 80; // above population norm for athletes
  if (rmssd >= 50) return 70; // near population norm
  if (rmssd >= 40) return 55; // below norm
  if (rmssd >= 30) return 40; // significantly below
  return 25; // very low — likely suppressed
}

/**
 * RHR modifier applied to AutonomicRaw.
 * Thresholds: Noakes 1991, Friel 2009 (practitioner consensus, Level 5).
 */
function rhrModifier(rhrDelta: number | null): number {
  if (rhrDelta === null) return 1.0; // no data — no change
  if (rhrDelta > 7) return 0.65;
  if (rhrDelta > 5) return 0.75;
  if (rhrDelta > 3) return 0.85;
  if (rhrDelta > -2) return 1.0;
  if (rhrDelta > -5) return 1.05;
  return 1.1;
}

/**
 * Compute the Autonomic Dimension Score from HRV and RHR features.
 * Returns null when no HRV data is available.
 */
export function scoreAutonomic(features: RecoveryFeatureSet): DimensionScore {
  const { hrvDeltaFromBaseline, hrvAbsolute, rhrDeltaFromBaseline } = features;

  if (hrvDeltaFromBaseline !== null) {
    // Primary path: personalized delta from baseline
    const raw = mapHrvDeltaToAutonomicRaw(hrvDeltaFromBaseline);
    const modifier = rhrModifier(rhrDeltaFromBaseline);
    const score = clamp(raw * modifier, 0, 100);
    return {
      score,
      available: true,
      qualityFactor: 0.7, // MEASURED_OPTICAL (Garmin overnight HRV)
    };
  }

  if (hrvAbsolute !== null) {
    // Fallback: population-level norms (less reliable — no personal baseline)
    const raw = mapHrvAbsoluteToAutonomicRaw(hrvAbsolute);
    const modifier = rhrModifier(rhrDeltaFromBaseline);
    const score = clamp(raw * modifier, 0, 100);
    return {
      score,
      available: true,
      qualityFactor: 0.4, // low quality — no baseline
    };
  }

  // No HRV data at all
  return { score: null, available: false, qualityFactor: 0.0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 2 — Sleep Score
// RECOVERY_MODEL.md §5.2
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map restorative sleep ratio (deep + REM) / total × 100 to a raw score.
 * Norme adulte typique pour le ratio restaurateur : 40–55 %.
 */
export function mapRestorativeSleepRatioToRaw(ratioPercent: number): number {
  if (ratioPercent >= 55) return 100;
  if (ratioPercent >= 45) return 85;
  if (ratioPercent >= 40) return 70;
  if (ratioPercent >= 32) return 50;
  if (ratioPercent >= 25) return 35;
  return 20;
}

/**
 * Debt modifier based on 7-day cumulative sleep debt.
 * Van Dongen et al. 2003: 6h/night × 14 days ≈ 24h total deprivation (Level 2).
 */
export function sleepDebtModifier(debtMinutes: number | null): number {
  if (debtMinutes === null) return 1.0;
  if (debtMinutes <= 30) return 1.0;
  if (debtMinutes <= 90) return 0.95;
  if (debtMinutes <= 150) return 0.9;
  if (debtMinutes <= 210) return 0.85;
  if (debtMinutes <= 300) return 0.75;
  if (debtMinutes <= 420) return 0.65;
  return 0.55;
}

export function scoreSleep(features: RecoveryFeatureSet): DimensionScore {
  const { sleepEfficiencyPercent } = features;

  if (sleepEfficiencyPercent === null) {
    return { score: null, available: false, qualityFactor: 0.0 };
  }

  const score = clamp(mapRestorativeSleepRatioToRaw(sleepEfficiencyPercent), 0, 100);

  return {
    score,
    available: true,
    qualityFactor: 0.65, // MEASURED_OPTICAL (Garmin sleep tracking)
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 3 — Subjective Score
// RECOVERY_MODEL.md §5.3
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map composite wellness index (0–10) to SubjectiveRaw.
 * Evidence: Saw et al. 2016 — subjective measures as sensitive as objective (Level 3).
 */
function mapWellnessToSubjectiveRaw(index: number): number {
  if (index >= 8.0) return 100;
  if (index >= 6.5) return 80;
  if (index >= 5.0) return 60;
  if (index >= 3.5) return 40;
  if (index >= 2.0) return 20;
  return 10;
}

/**
 * RPE modifier: when perceived effort > expected, recovery is likely incomplete.
 * Foster et al. 2001 — RPE drift as early overreaching indicator (Level 3-5).
 */
function rpeVsTargetModifier(rpeVsTarget: number | null): number {
  if (rpeVsTarget === null) return 1.0;
  if (rpeVsTarget < -1.5) return 1.05;
  if (rpeVsTarget <= 1.5) return 1.0;
  if (rpeVsTarget <= 3.0) return 0.9;
  return 0.75;
}

export function scoreSubjective(features: RecoveryFeatureSet): DimensionScore {
  const { subjectiveWellnessIndex, rpeVsTargetZone } = features;

  if (subjectiveWellnessIndex === null) {
    return { score: null, available: false, qualityFactor: 0.0 };
  }

  const raw = mapWellnessToSubjectiveRaw(subjectiveWellnessIndex);
  const modifier = rpeVsTargetModifier(rpeVsTargetZone);
  const score = clamp(raw * modifier, 0, 100);

  return {
    score,
    available: true,
    qualityFactor: 0.8, // MANUAL athlete self-report
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 4 — Load Context Score
// RECOVERY_MODEL.md §5.4
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map ACWR to LoadContextRaw.
 * Evidence: Gabbett 2016, Hulin et al. 2017 (Level 1-3).
 * The "sweet spot" is 0.8–1.3 ACWR where recovery is achievable.
 */
function mapAcwrToLoadContextRaw(acwr: number | null): number {
  if (acwr === null) return 75; // neutral assumption when no data
  if (acwr < 0.8) return 70; // undertrained
  if (acwr <= 1.0) return 85; // well-managed
  if (acwr <= 1.3) return 100; // optimal zone
  if (acwr <= 1.5) return 65; // elevated
  if (acwr <= 1.8) return 40; // high
  if (acwr <= 2.0) return 20; // dangerously high
  return 5; // critical
}

/**
 * Monotony modifier.
 * Foster et al. 1998 — high monotony impairs recovery efficiency (Level 5).
 */
function monotonyModifier(monotony: number | null): number {
  if (monotony === null) return 1.0;
  if (monotony < 1.5) return 1.05;
  if (monotony <= 2.0) return 1.0;
  if (monotony <= 2.5) return 0.9;
  return 0.8;
}

export function scoreLoadContext(load: LoadFeatureSet | 'PENDING'): DimensionScore {
  if (load === 'PENDING') {
    // No load data — use neutral score with low confidence
    return { score: 75, available: true, qualityFactor: 0.4 };
  }

  const raw = mapAcwrToLoadContextRaw(load.acwr);
  const modifier = monotonyModifier(load.loadMonotony);
  const score = clamp(raw * modifier, 0, 100);

  return {
    score,
    available: true,
    qualityFactor: 0.85, // derived from feature extraction — reliable
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Synthesis — Weighted Composite
// RECOVERY_MODEL.md §5.5
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default dimension weights (evidence-based, from RECOVERY_MODEL.md Table 5.5).
 * Total = 1.00
 */
const DEFAULT_WEIGHTS = {
  autonomic: 0.35,
  sleep: 0.3,
  subjective: 0.25,
  loadContext: 0.1,
} as const;

type DimensionKey = keyof typeof DEFAULT_WEIGHTS;

/**
 * Compute the weighted composite ReadinessScore from scored dimensions.
 *
 * Dynamic weight redistribution: when dimensions are PENDING, their weight
 * is redistributed proportionally to available dimensions.
 * The Load Context dimension receives NO redistribution bonus (it is
 * contextual, not a recovery measure).
 *
 * Returns null when fewer than 2 dimensions are available.
 */
export function synthesizeScore(dimensions: ScoredDimensions): {
  score: number | null;
  confidence: number;
  availableCount: number;
  redistributedWeights: Record<DimensionKey, number>;
} {
  const available = Object.entries(dimensions).filter(
    ([, dim]) => (dim as DimensionScore).available && (dim as DimensionScore).score !== null,
  ) as Array<[DimensionKey, DimensionScore]>;

  const availableCount = available.length;

  if (availableCount < 2) {
    return {
      score: null,
      confidence: 0.0,
      availableCount,
      redistributedWeights: { ...DEFAULT_WEIGHTS },
    };
  }

  // Compute total available weight (not counting PENDING dimensions)
  const totalAvailableWeight = available.reduce((sum, [key]) => sum + DEFAULT_WEIGHTS[key], 0);

  // Redistribute weights proportionally (no bonus to loadContext)
  const redistributedWeights: Record<DimensionKey, number> = {
    autonomic: 0,
    sleep: 0,
    subjective: 0,
    loadContext: 0,
  };

  for (const [key] of available) {
    redistributedWeights[key] = DEFAULT_WEIGHTS[key] / totalAvailableWeight;
  }

  // Weighted sum
  const rawScore = available.reduce((sum, [key, dim]) => {
    return sum + (dim.score ?? 0) * redistributedWeights[key];
  }, 0);

  const score = Math.round(clamp(rawScore, 0, 100));

  // Measurement quality factor
  const qualityFactor = available.reduce((sum, [key, dim]) => {
    return sum + dim.qualityFactor * redistributedWeights[key];
  }, 0);

  return { score, confidence: qualityFactor, availableCount, redistributedWeights };
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence
// RECOVERY_MODEL.md §8
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Baseline maturity factor — HRV delta requires an established baseline.
 * Simplification for v1: if delta from baseline is available → adequate baseline.
 */
export function baselineMaturityFactor(features: RecoveryFeatureSet): number {
  if (features.hrvDeltaFromBaseline !== null) {
    return 0.8; // adequate baseline (14-day minimum implied by the extractor)
  }
  return 0.4; // no baseline established
}

/**
 * Signal consistency factor — detects objective/subjective dissonance.
 * Per RECOVERY_MODEL.md §8.3 and §9.1.
 */
export function signalConsistencyFactor(
  autonomicScore: number | null,
  sleepScore: number | null,
  subjectiveScore: number | null,
): { factor: number; dissonanceDetected: boolean } {
  if (autonomicScore === null || subjectiveScore === null) {
    return { factor: 1.0, dissonanceDetected: false };
  }

  // Objective = average of available objective markers
  const objectiveScores = [autonomicScore, sleepScore].filter((s): s is number => s !== null);
  if (objectiveScores.length === 0) return { factor: 1.0, dissonanceDetected: false };

  const objectiveAvg = objectiveScores.reduce((a, b) => a + b, 0) / objectiveScores.length;
  const diff = Math.abs(objectiveAvg - subjectiveScore);

  if (diff > 40) return { factor: 0.7, dissonanceDetected: true };
  if (diff > 20) return { factor: 0.85, dissonanceDetected: true };
  return { factor: 1.0, dissonanceDetected: false };
}

/**
 * Compute all four dimension scores at once.
 */
export function scoreAllDimensions(
  recovery: RecoveryFeatureSet,
  load: LoadFeatureSet | 'PENDING',
): ScoredDimensions {
  return {
    autonomic: scoreAutonomic(recovery),
    sleep: scoreSleep(recovery),
    subjective: scoreSubjective(recovery),
    loadContext: scoreLoadContext(load),
  };
}
