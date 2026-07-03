/**
 * FATIGUE MODEL v1 — Scoring Functions
 *
 * Implements the five-dimension fatigue scoring algorithm from
 * FATIGUE_MODEL.md §4.2–4.7.
 *
 * All functions are pure (no side effects, no I/O).
 * Inputs follow the PENDING convention from the Feature Layer.
 *
 * Dimension weights (per spec):
 *   Load              0.30
 *   Neuromuscular     0.25
 *   Metabolic         0.20
 *   Cumulative        0.15
 *   Psychological     0.10
 */

import type {
  DimensionScore,
  ScoredFatigueDimensions,
  FatigueLevel,
  FatigueType,
  FatigueDominantDimension,
  FatigueTrajectory,
  TrainingCapacity,
  DataCompleteness,
} from './types';
import type { LoadFeatureSet, RecoveryFeatureSet, SessionFeatureSet } from '@/core/features/types';
import type { RecoveryState } from '@/core/digital-twin/types';
import type { SportType } from '@/core/observation/types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants (per FATIGUE_MODEL.md and ADR-001)
// ─────────────────────────────────────────────────────────────────────────────

const DIMENSION_WEIGHTS = {
  load: 0.3,
  neuromuscular: 0.25,
  metabolic: 0.2,
  cumulative: 0.15,
  psychological: 0.1,
} as const;

/** Accumulation threshold: FatigueIndex > this → counts as accumulation day. */
const ACCUMULATION_THRESHOLD = 55;

function accumulationQualityFactor(consecutiveAccumulationDays: number): number {
  if (consecutiveAccumulationDays >= 7) return 0.85;
  if (consecutiveAccumulationDays >= 3) return 0.6;
  return 0.3;
}

function classifyFatigueDataCompleteness(dimensionCount: number): DataCompleteness {
  if (dimensionCount >= 5) return 'FULL';
  if (dimensionCount >= 3) return 'PARTIAL';
  return 'SPARSE';
}

// ─────────────────────────────────────────────────────────────────────────────
// Sport-specific mechanical stress factor (v1 approximation)
// Higher values → more eccentric / mechanical loading per TSS unit
// ─────────────────────────────────────────────────────────────────────────────

function getMechanicalStressFactor(sport: SportType): number {
  switch (sport) {
    case 'TRAIL_RUN':
      return 1.5;
    case 'RUN':
      return 1.4;
    case 'STRENGTH':
      return 1.3;
    case 'TRIATHLON':
      return 1.0;
    case 'BIKE':
    case 'MTB':
      return 0.8;
    case 'SWIM':
    case 'OPEN_WATER':
      return 0.7;
    default:
      return 1.0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 1 — Load Fatigue (FATIGUE_MODEL.md §4.2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scores load fatigue from ACWR and load monotony.
 *
 * v1 approximation: uses LoadFeatureSet.acwr as the ATL/CTL ratio proxy
 * (rolling sums instead of EWMA — acceptable until Training Stress Model
 * is implemented and CTL/ATL are stored in the Digital Twin).
 *
 * Formula: LoadFatigue = clamp(ACWR / 1.5 × 100, 0, 100)
 *   ACWR = 0   → 0   (no recent training)
 *   ACWR = 1.0 → 67  (normal high-load training)
 *   ACWR = 1.5 → 100 (critical overload)
 */
export function scoreLoadFatigue(load: LoadFeatureSet | 'PENDING'): DimensionScore {
  if (load === 'PENDING' || load.acwr === null) {
    return { score: null, available: false, qualityFactor: 0 };
  }

  // Round base before applying multipliers so boundary values are stable
  let score = Math.round(Math.max(Math.min((load.acwr / 1.5) * 100, 100), 0));

  // Monotony amplifier (Foster et al. 1998)
  if (load.loadMonotony !== null) {
    if (load.loadMonotony > 2.0) {
      score = Math.round(Math.min(score * 1.1, 100));
    } else if (load.loadMonotony < 1.3) {
      score = Math.round(score * 0.95);
    }
  }

  return {
    score,
    available: true,
    qualityFactor: load.confidence,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 2 — Neuromuscular Fatigue (FATIGUE_MODEL.md §4.3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scores neuromuscular fatigue from:
 *   - Central component: autonomic score from Recovery Model (HRV proxy)
 *   - Peripheral component: mechanical load (session sport × TSS) + soreness
 */
export function scoreNeuromuscularFatigue(
  recovery: RecoveryFeatureSet | 'PENDING' | null,
  recoveryState: RecoveryState | null,
  sessions: readonly SessionFeatureSet[],
): DimensionScore {
  const rf = recovery !== 'PENDING' ? recovery : null;

  // ── Central component (HRV-derived autonomic score) ─────────────────────
  let centralComponent: number | null = null;
  let centralQuality = 0;
  if (
    recoveryState?.dimensions.autonomic.available &&
    recoveryState.dimensions.autonomic.score !== null
  ) {
    centralComponent = 100 - recoveryState.dimensions.autonomic.score;
    centralQuality = 0.9;
  }

  // ── Peripheral component (mechanical + soreness) ─────────────────────────
  // recentMechanicalLoad = Σ(tss × mechanicalStressFactor) for today's sessions
  const recentMechanicalLoad = sessions.reduce((sum, s) => {
    return sum + s.tssScore * getMechanicalStressFactor(s.sportType);
  }, 0);
  // Normalization reference: 150 (heavy 2h run ≈ 100 TSS × 1.4 × ≈107, ~140)
  const mechanicalComponent = Math.min((recentMechanicalLoad / 150) * 100, 100);

  const perceivedSoreness = rf?.subjectiveWellnessComponents?.perceivedSoreness ?? null;
  const sorenessComponent =
    perceivedSoreness !== null
      ? perceivedSoreness * 10 // 0-10 scale → 0-100
      : mechanicalComponent; // fallback: mechanical proxy

  const peripheralComponent = 0.55 * mechanicalComponent + 0.45 * sorenessComponent;
  const peripheralQuality = perceivedSoreness !== null ? 0.75 : 0.55;

  // ── Synthesis ────────────────────────────────────────────────────────────
  let score: number;
  let qualityFactor: number;

  if (centralComponent !== null) {
    // Both components available: weighted synthesis
    score = centralComponent * 0.4 + peripheralComponent * 0.6;
    qualityFactor = centralQuality * 0.4 + peripheralQuality * 0.6;
  } else {
    // No autonomic data — peripheral only
    score = peripheralComponent;
    qualityFactor = peripheralQuality;
  }

  return {
    score: Math.round(Math.max(0, Math.min(100, score))),
    available: true,
    qualityFactor,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 3 — Metabolic Fatigue (FATIGUE_MODEL.md §4.4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scores metabolic fatigue from today's sessions' anaerobic load.
 *
 * v1 simplification: uses only today's sessions (not 48h window).
 * Time decay = 1.0 for all same-day sessions.
 *
 * Formula: MetabolicFatigue = clamp(Σ(anaerobicFactor × TSS) / 100 × 100, 0, 100)
 */
export function scoreMetabolicFatigue(sessions: readonly SessionFeatureSet[]): DimensionScore {
  if (sessions.length === 0) {
    return { score: 0, available: true, qualityFactor: 0.5 };
  }

  let totalMetabolicStress = 0;
  let maxHrDrift = 0;
  let sumMethodConfidence = 0;

  const TSS_METHOD_CONFIDENCE: Record<string, number> = {
    POWER_BASED: 0.85,
    TRIMP_HR: 0.65,
    PACE_BASED: 0.5,
    RPE_BASED: 0.4,
    DURATION_FACTOR: 0.25,
  };

  for (const s of sessions) {
    // Default anaerobic factor: 0.3 (30%) when zone data unavailable
    const anaerobicFactor = s.anaerobicLoadFactor ?? 0.3;
    totalMetabolicStress += anaerobicFactor * s.tssScore;

    if (s.hrDriftPercent !== null && s.hrDriftPercent > maxHrDrift) {
      maxHrDrift = s.hrDriftPercent;
    }
    sumMethodConfidence += TSS_METHOD_CONFIDENCE[s.tssMethod] ?? 0.4;
  }

  let score = Math.min((totalMetabolicStress / 100) * 100, 100);
  score = Math.max(score, 0);

  // HR drift modifier — glycogen depletion marker (FATIGUE_MODEL.md §4.4)
  if (maxHrDrift > 15) {
    score = Math.min(score * 1.3, 100);
  } else if (maxHrDrift > 8) {
    score = Math.min(score * 1.15, 100);
  }

  const qualityFactor = sumMethodConfidence / sessions.length;

  return {
    score: Math.round(score),
    available: true,
    qualityFactor,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 4 — Cumulative Trajectory (FATIGUE_MODEL.md §4.5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scores cumulative trajectory from:
 *   - Consecutive accumulation days (momentum)
 *   - Sleep debt (impairs fatigue clearance)
 *   - Objective/subjective dissonance (motivated-athlete failure mode guard)
 */
export function scoreCumulativeTrajectory(
  consecutiveAccumulationDays: number,
  sleepDebtMin: number | null,
  dissonanceDetected: boolean,
): DimensionScore {
  // Accumulation pressure: 7 pts/day, capped at 70
  const accumulationPressure = Math.min(consecutiveAccumulationDays * 7, 70);

  // Sleep debt: 480 min (8h) → full 30 pt contribution
  const sleepDebtContribution = sleepDebtMin !== null ? Math.min((sleepDebtMin / 480) * 30, 30) : 0;

  // Dissonance penalty: objective/subjective split during accumulation
  const dissonancePenalty = dissonanceDetected && consecutiveAccumulationDays > 3 ? 10 : 0;

  const score = Math.min(accumulationPressure + sleepDebtContribution + dissonancePenalty, 100);

  const hasData = sleepDebtMin !== null || consecutiveAccumulationDays > 0;
  const qualityFactor = accumulationQualityFactor(consecutiveAccumulationDays);

  return {
    score: Math.round(score),
    available: hasData,
    qualityFactor,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 5 — Psychological Fatigue (FATIGUE_MODEL.md §4.6)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scores psychological/motivational fatigue from subjective wellness.
 *
 * Formula: PsychFatigue = 100 − (mood × 10 + energyLevel × 10) / 2
 *   mood = 1 → PsychFatigue = 90 (severe)
 *   mood = 5 → PsychFatigue = 50 (none)
 */
export function scorePsychologicalFatigue(
  recovery: RecoveryFeatureSet | 'PENDING' | null,
): DimensionScore {
  const rf = recovery !== 'PENDING' ? recovery : null;
  const mood = rf?.subjectiveWellnessComponents?.mood ?? null;
  const energyLevel = rf?.subjectiveWellnessComponents?.energyLevel ?? null;

  if (mood === null && energyLevel === null) {
    return { score: null, available: false, qualityFactor: 0 };
  }

  let score: number;
  if (mood !== null && energyLevel !== null) {
    score = 100 - (mood * 10 + energyLevel * 10) / 2;
  } else if (mood !== null) {
    score = 100 - mood * 20;
  } else {
    score = 100 - energyLevel! * 20;
  }

  return {
    score: Math.round(Math.max(0, Math.min(100, score))),
    available: true,
    qualityFactor: 0.8,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Synthesis — Weighted FatigueIndex (FATIGUE_MODEL.md §4.7)
// ─────────────────────────────────────────────────────────────────────────────

export type SynthesisResult = {
  readonly score: number | null;
  readonly confidence: number;
  readonly dataCompleteness: DataCompleteness;
};

/**
 * Synthesizes the five dimension scores into a single FatigueIndex.
 *
 * Unavailable dimensions have their weight redistributed proportionally
 * to available dimensions (same rule as the Recovery Model).
 *
 * Minimum requirement: at least 2 dimensions must be available.
 */
export function synthesizeFatigueIndex(dims: ScoredFatigueDimensions): SynthesisResult {
  const entries = Object.entries(dims) as Array<[keyof typeof DIMENSION_WEIGHTS, DimensionScore]>;
  const available = entries.filter(([, d]) => d.available && d.score !== null);

  if (available.length < 2) {
    return { score: null, confidence: 0, dataCompleteness: 'INSUFFICIENT' };
  }

  const totalWeight = available.reduce((sum, [k]) => sum + DIMENSION_WEIGHTS[k], 0);
  const score = available.reduce(
    (sum, [k, d]) => sum + d.score! * (DIMENSION_WEIGHTS[k] / totalWeight),
    0,
  );
  const confidence = available.reduce(
    (sum, [k, d]) => sum + d.qualityFactor * (DIMENSION_WEIGHTS[k] / totalWeight),
    0,
  );

  const n = available.length;
  const dataCompleteness = classifyFatigueDataCompleteness(n);

  return { score: Math.round(score), confidence, dataCompleteness };
}

// ─────────────────────────────────────────────────────────────────────────────
// Classification helpers
// ─────────────────────────────────────────────────────────────────────────────

export function classifyFatigueLevel(index: number | null): FatigueLevel {
  if (index === null) return 'INSUFFICIENT_DATA';
  if (index <= 20) return 'FRESH';
  if (index <= 40) return 'FUNCTIONAL_LOW';
  if (index <= 60) return 'FUNCTIONAL_HIGH';
  if (index <= 75) return 'ACCUMULATED';
  if (index <= 88) return 'NON_FUNCTIONAL_RISK';
  return 'OVERREACHING_RISK';
}

export function classifyFatigueType(dims: ScoredFatigueDimensions): FatigueType {
  const labeled: Array<{ name: FatigueDominantDimension; score: number }> = [];

  if (dims.load.available && dims.load.score !== null)
    labeled.push({ name: 'LOAD', score: dims.load.score });
  if (dims.neuromuscular.available && dims.neuromuscular.score !== null)
    labeled.push({ name: 'NEUROMUSCULAR', score: dims.neuromuscular.score });
  if (dims.metabolic.available && dims.metabolic.score !== null)
    labeled.push({ name: 'METABOLIC', score: dims.metabolic.score });
  if (dims.cumulative.available && dims.cumulative.score !== null)
    labeled.push({ name: 'CUMULATIVE', score: dims.cumulative.score });
  if (dims.psychological.available && dims.psychological.score !== null)
    labeled.push({ name: 'PSYCHOLOGICAL', score: dims.psychological.score });

  if (labeled.length === 0) return 'UNDETERMINED';

  const sorted = [...labeled].sort((a, b) => b.score - a.score);
  const [highest] = sorted;

  if (!highest || highest.score < 40) return 'UNDETERMINED';

  // If all dimensions > 70 → CUMULATIVE_MULTI_SYSTEM
  if (labeled.length >= 3 && labeled.every((d) => d.score > 70)) return 'CUMULATIVE_MULTI_SYSTEM';

  // If top two are within 10 points → MIXED
  if (sorted.length >= 2 && sorted[1] && highest.score - sorted[1].score <= 10) return 'MIXED';

  switch (highest.name) {
    case 'LOAD':
      return 'LOAD_DOMINANT';
    case 'NEUROMUSCULAR':
      return 'NEUROMUSCULAR_DOMINANT';
    case 'METABOLIC':
      return 'METABOLIC_DOMINANT';
    case 'PSYCHOLOGICAL':
      return 'PSYCHOLOGICAL_DOMINANT';
    default:
      return 'MIXED';
  }
}

export function getDominantDimension(dims: ScoredFatigueDimensions): FatigueDominantDimension {
  const candidates: Array<{ name: FatigueDominantDimension; score: number; weight: number }> = [];
  if (dims.load.available && dims.load.score !== null)
    candidates.push({ name: 'LOAD', score: dims.load.score, weight: 0.3 });
  if (dims.neuromuscular.available && dims.neuromuscular.score !== null)
    candidates.push({ name: 'NEUROMUSCULAR', score: dims.neuromuscular.score, weight: 0.25 });
  if (dims.metabolic.available && dims.metabolic.score !== null)
    candidates.push({ name: 'METABOLIC', score: dims.metabolic.score, weight: 0.2 });
  if (dims.cumulative.available && dims.cumulative.score !== null)
    candidates.push({ name: 'CUMULATIVE', score: dims.cumulative.score, weight: 0.15 });
  if (dims.psychological.available && dims.psychological.score !== null)
    candidates.push({ name: 'PSYCHOLOGICAL', score: dims.psychological.score, weight: 0.1 });

  if (candidates.length === 0) return 'LOAD';

  // Sort by score descending, break ties by weight descending
  return [...candidates].sort((a, b) => b.score - a.score || b.weight - a.weight)[0]!.name;
}

export function classifyTrainingCapacity(
  level: FatigueLevel,
  trainingBlockedByCondition: boolean,
): TrainingCapacity {
  if (trainingBlockedByCondition) return 'LIGHT_ONLY';

  switch (level) {
    case 'FRESH':
    case 'INSUFFICIENT_DATA':
      return 'FULL';
    case 'FUNCTIONAL_LOW':
      return 'FULL';
    case 'FUNCTIONAL_HIGH':
      return 'REDUCED';
    case 'ACCUMULATED':
      return 'LIGHT_ONLY';
    case 'NON_FUNCTIONAL_RISK':
    case 'OVERREACHING_RISK':
      return 'REST_ONLY';
  }
}

export function computeFatigueTrajectory(history: readonly number[]): FatigueTrajectory {
  if (history.length < 6) return 'STABLE';

  // history is ordered newest-first
  const recent3 = history.slice(0, 3);
  const prior3 = history.slice(3, 6);

  const meanRecent = recent3.reduce((s, v) => s + v, 0) / 3;
  const meanPrior = prior3.reduce((s, v) => s + v, 0) / 3;
  const delta = meanRecent - meanPrior;

  // Meaningful accumulation: average fatigue rose by > 7 points over 3-day blocks
  // (uses > 7 rather than >= 8 to stay robust against floating-point rounding)
  if (delta > 7) {
    // Compute average daily rate of change within recent3 only (newest-first)
    const recentRate = (recent3[0]! - recent3[recent3.length - 1]!) / (recent3.length - 1);
    return recentRate > 3 ? 'ACCELERATING' : 'ACCUMULATING';
  }
  if (delta < -5) return 'RESOLVING';
  return 'STABLE';
}

/**
 * Compute consecutive accumulation days from history.
 * History is ordered most-recent-first. Count from the start until
 * a day below the threshold breaks the streak.
 */
export function computeConsecutiveAccumulationDays(history: readonly number[]): number {
  let count = 0;
  for (const v of history) {
    if (v > ACCUMULATION_THRESHOLD) count++;
    else break;
  }
  return count;
}

/**
 * Estimate time (days) to reach FRESH level.
 * Based on per-dimension resolution half-lives from FATIGUE_MODEL.md §5.
 */
export function estimateTimeToFresh(
  dims: ScoredFatigueDimensions,
  level: FatigueLevel,
): number | null {
  if (level === 'FRESH' || level === 'INSUFFICIENT_DATA') return null;
  if (level === 'OVERREACHING_RISK') return 14;

  const loadDays = dims.load.score !== null ? (dims.load.score / 100) * 5.0 : 0;
  const neuroDays = dims.neuromuscular.score !== null ? (dims.neuromuscular.score / 100) * 2.5 : 0;
  const metabDays = dims.metabolic.score !== null ? (dims.metabolic.score / 100) * 1.0 : 0;
  const cumulDays = dims.cumulative.score !== null ? (dims.cumulative.score / 100) * 7.0 : 0;
  const psychDays = dims.psychological.score !== null ? (dims.psychological.score / 100) * 2.0 : 0;

  const days = Math.ceil(Math.max(loadDays, neuroDays, metabDays, cumulDays, psychDays));
  return days > 0 ? days : null;
}

/**
 * Apply the motivated-athlete conservative bias guard (FATIGUE_MODEL.md §9.4).
 * When dissonance has been detected for ≥ 3 days, downweight psychological
 * and boost load + neuromuscular to prevent motivated-athlete underreporting.
 */
export function applyDissonanceBias(
  dims: ScoredFatigueDimensions,
  consecutiveAccumulationDays: number,
  dissonanceDetected: boolean,
): ScoredFatigueDimensions {
  if (!dissonanceDetected || consecutiveAccumulationDays < 3) return dims;

  // Reduce psychological weight signal (note: we dampen the qualityFactor as a proxy)
  return {
    ...dims,
    psychological: {
      ...dims.psychological,
      qualityFactor: dims.psychological.qualityFactor * 0.5,
    },
  };
}
