/**
 * RECOVERY MODEL v1 — Main inference function
 *
 * Entry point: `runRecoveryModel(features, context) → RecoveryModelOutput`
 *
 * This is a pure function. It:
 *   1. Computes dimension scores (scoring.ts)
 *   2. Synthesizes the composite ReadinessScore
 *   3. Generates ephemeral Signals
 *   4. Determines the RecoveryState (for Digital Twin update)
 *   5. Makes a Decision (verdict + recommended intensity)
 *   6. Generates a Recommendation (athlete-facing)
 *   7. Generates a human-readable Explanation
 *
 * No side effects. No database calls. No randomness.
 * Running this function twice with identical inputs always produces identical outputs.
 *
 * Model ID: recovery-synthesis-v1
 * Reference: docs/models/RECOVERY_MODEL.md
 */

import type {
  DataCompleteness,
  IllnessRisk,
  OverreachingRisk,
  ReadinessCategory,
  RecoveryState,
} from '@/core/digital-twin/types';
import type { DayFeatures, LoadFeatureSet, RecoveryFeatureSet } from '@/core/features/types';
import type {
  RecommendedIntensity,
  RecoveryDecision,
  RecoveryModelContext,
  RecoveryModelOutput,
  RecoveryRecommendation,
  RecoverySignals,
  RecoveryVerdict,
} from './types';

import {
  baselineMaturityFactor,
  scoreAllDimensions,
  signalConsistencyFactor,
  synthesizeScore,
} from './scoring';

import type { I18nItem } from '@/core/inference/shared/types';

// ─────────────────────────────────────────────────────────────────────────────
// Signals
// ─────────────────────────────────────────────────────────────────────────────

function classifyAutonomicBalance(score: number | null): RecoverySignals['autonomicBalance'] {
  if (score === null) return 'SUPPRESSED'; // treat unknown as suppressed (conservative)
  if (score >= 85) return 'ENHANCED';
  if (score >= 65) return 'NORMAL';
  if (score >= 45) return 'MILDLY_SUPPRESSED';
  if (score >= 25) return 'SUPPRESSED';
  return 'CRITICALLY_SUPPRESSED';
}

function classifySleepAdequacy(score: number | null): RecoverySignals['sleepAdequacy'] {
  if (score === null) return 'INSUFFICIENT';
  if (score >= 90) return 'EXCELLENT';
  if (score >= 70) return 'ADEQUATE';
  if (score >= 40) return 'INSUFFICIENT';
  return 'SEVERELY_INSUFFICIENT';
}

function classifySubjectiveWellness(score: number | null): RecoverySignals['subjectiveWellness'] {
  if (score === null) return 'NORMAL'; // unknown = neutral
  if (score >= 75) return 'HIGH';
  if (score >= 50) return 'NORMAL';
  if (score >= 25) return 'LOW';
  return 'VERY_LOW';
}

function classifyLoadContext(score: number | null): RecoverySignals['loadStressContext'] {
  if (score === null) return 'OPTIMAL';
  if (score >= 85) return 'UNDERTRAINED';
  if (score >= 75) return 'OPTIMAL';
  if (score >= 55) return 'ELEVATED';
  if (score >= 25) return 'HIGH';
  return 'CRITICAL';
}

function computeOverreachingRisk(
  autonomic: number | null,
  sleep: number | null,
  subjective: number | null,
  loadContext: number | null,
): OverreachingRisk {
  const scores = [autonomic, sleep, subjective, loadContext].filter((s): s is number => s !== null);

  // CRITICAL: 3+ dimensions < 30 (OTS territory — Meeusen et al. 2013)
  if (scores.filter((s) => s < 30).length >= 3) return 'CRITICAL';

  // HIGH: autonomic < 30 AND sleep < 40 simultaneously (autonomic + sleep crisis)
  if (autonomic !== null && autonomic < 30 && sleep !== null && sleep < 40) return 'HIGH';

  // MODERATE: any 2 primary dimensions < 45
  const primaryScores = [autonomic, sleep, subjective].filter((s): s is number => s !== null);
  if (primaryScores.filter((s) => s < 45).length >= 2) return 'MODERATE';

  return 'LOW';
}

function computeIllnessRisk(
  recovery: RecoveryFeatureSet,
  load: LoadFeatureSet | 'PENDING',
): IllnessRisk {
  const { hrvDeltaFromBaseline } = recovery;
  if (hrvDeltaFromBaseline === null) return 'LOW';

  const acuteLoad = load !== 'PENDING' ? load.acuteLoad : null;
  const chronicLoad = load !== 'PENDING' ? load.chronicLoad : null;

  // HIGH: HRV drop > 30% without training load explanation (immune activation pattern)
  if (
    hrvDeltaFromBaseline < -30 &&
    acuteLoad !== null &&
    chronicLoad !== null &&
    acuteLoad < chronicLoad * 0.7
  ) {
    return 'HIGH';
  }

  // ELEVATED: HRV drop > 20%
  if (hrvDeltaFromBaseline < -20) return 'ELEVATED';

  return 'LOW';
}

// ─────────────────────────────────────────────────────────────────────────────
// ReadinessCategory mapping
// ─────────────────────────────────────────────────────────────────────────────

function mapScoreToCategory(score: number | null, availableCount: number): ReadinessCategory {
  if (score === null) {
    return availableCount === 0 ? 'INSUFFICIENT_DATA' : 'BASELINE_PENDING';
  }
  if (score >= 85) return 'OPTIMAL';
  if (score >= 70) return 'ADEQUATE';
  if (score >= 50) return 'REDUCED';
  if (score >= 30) return 'LOW';
  return 'VERY_LOW';
}

function capScoreForHighIllnessRisk(
  illnessRisk: IllnessRisk,
  finalScore: number | null,
): number | null {
  if (illnessRisk !== 'HIGH') return finalScore;
  if (finalScore === null) return 25;
  return Math.min(finalScore, 25);
}

function classifyDataCompleteness(availableCount: number): DataCompleteness {
  if (availableCount >= 4) return 'FULL';
  if (availableCount >= 2) return 'PARTIAL';
  if (availableCount === 1) return 'SPARSE';
  return 'INSUFFICIENT';
}

// ─────────────────────────────────────────────────────────────────────────────
// Limiting factor
// ─────────────────────────────────────────────────────────────────────────────

type DimensionKey = 'autonomic' | 'sleep' | 'subjective' | 'loadContext';

function findPrimaryLimitingFactor(scores: {
  autonomic: number | null;
  sleep: number | null;
  subjective: number | null;
  loadContext: number | null;
}): DimensionKey | null {
  const entries = Object.entries(scores) as Array<[DimensionKey, number | null]>;
  const available = entries.filter(([, s]) => s !== null);
  if (available.length === 0) return null;

  return available.reduce((lowest, [key, score]) => {
    const lowestScore = scores[lowest];
    return score !== null && (lowestScore === null || score < (lowestScore ?? Infinity))
      ? key
      : lowest;
  }, available[0][0]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Decision
// ─────────────────────────────────────────────────────────────────────────────

function makeDecision(
  category: ReadinessCategory,
  signals: RecoverySignals,
  dissonanceType: 'OBJECTIVE_POOR_SUBJECTIVE_GOOD' | 'OBJECTIVE_GOOD_SUBJECTIVE_POOR' | 'NONE',
): RecoveryDecision {
  const rationale: I18nItem[] = [];

  if (signals.illnessRisk === 'HIGH') {
    return {
      verdict: 'OVERREACHED',
      recommendedIntensity: 'REST',
      rationale: [
        { code: 'recovery.rationale.illnessRisk.acute' },
        { code: 'recovery.rationale.illnessRisk.mandatory' },
        { code: 'recovery.rationale.illnessRisk.consult' },
      ],
    };
  }

  let verdict: RecoveryVerdict;
  let recommendedIntensity: RecommendedIntensity;

  switch (category) {
    case 'OPTIMAL':
      verdict = 'RECOVERED';
      recommendedIntensity =
        signals.overreachingRisk === 'LOW' && dissonanceType !== 'OBJECTIVE_POOR_SUBJECTIVE_GOOD'
          ? 'HARD'
          : 'MODERATE';
      rationale.push({ code: 'recovery.rationale.excellent' });
      break;

    case 'ADEQUATE':
      verdict = 'PARTIALLY_RECOVERED';
      recommendedIntensity = 'MODERATE';
      rationale.push({ code: 'recovery.rationale.good' });
      break;

    case 'REDUCED':
      verdict = 'PARTIALLY_RECOVERED';
      recommendedIntensity = 'EASY';
      rationale.push({ code: 'recovery.rationale.partial' });
      break;

    case 'LOW':
      verdict = 'FATIGUED';
      recommendedIntensity = 'VERY_EASY';
      rationale.push({ code: 'recovery.rationale.incomplete' });
      break;

    case 'VERY_LOW':
      verdict = 'FATIGUED';
      recommendedIntensity = 'REST';
      rationale.push({ code: 'recovery.rationale.insufficient' });
      break;

    case 'BASELINE_PENDING':
    case 'INSUFFICIENT_DATA':
    default:
      verdict = 'INSUFFICIENT_DATA';
      recommendedIntensity = 'EASY';
      rationale.push({ code: 'recovery.rationale.noData' });
      break;
  }

  if (
    signals.autonomicBalance === 'SUPPRESSED' ||
    signals.autonomicBalance === 'CRITICALLY_SUPPRESSED'
  ) {
    rationale.push({ code: 'recovery.rationale.autonomicSuppressed' });
  }
  if (
    signals.sleepAdequacy === 'SEVERELY_INSUFFICIENT' ||
    signals.sleepAdequacy === 'INSUFFICIENT'
  ) {
    rationale.push({ code: 'recovery.rationale.sleepLimiting' });
  }
  if (signals.overreachingRisk === 'HIGH' || signals.overreachingRisk === 'CRITICAL') {
    rationale.push({ code: 'recovery.rationale.overreachingRisk' });
  }
  if (signals.dissonanceDetected) {
    rationale.push({ code: 'recovery.rationale.dissonance' });
  }

  return { verdict, recommendedIntensity, rationale: rationale.slice(0, 3) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation
// ─────────────────────────────────────────────────────────────────────────────

function makeRecommendation(
  decision: RecoveryDecision,
  score: number | null,
  confidence: number,
): RecoveryRecommendation {
  const keyEvidence: I18nItem[] = [];
  if (score !== null) {
    keyEvidence.push({ code: 'recovery.evidence.score', params: { score } });
  }
  keyEvidence.push(...decision.rationale.slice(0, 2));

  return {
    type: decision.recommendedIntensity,
    keyEvidence: keyEvidence.slice(0, 3),
    confidence,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Time to full recovery
// ─────────────────────────────────────────────────────────────────────────────

function estimateTimeToFullRecovery(score: number | null): number | null {
  if (score === null || score >= 70) return null; // already recovered
  return Math.ceil((70 - score) / 10); // rough: ~1 day per 10 points below threshold
}

// ─────────────────────────────────────────────────────────────────────────────
// Main model function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run one complete inference pass of the Recovery Model.
 *
 * @param features - DayFeatures for the training day being inferred.
 * @param context - Non-feature inputs (previous score from Digital Twin).
 * @returns Complete model output including state update, decision, and recommendation.
 */
export function runRecoveryModel(
  features: DayFeatures,
  context: RecoveryModelContext,
): RecoveryModelOutput {
  const recovery = features.recovery !== 'PENDING' ? features.recovery : null;
  const { load } = features;

  // ── Dimension scoring ─────────────────────────────────────────────────────
  const dims = recovery
    ? scoreAllDimensions(recovery, load)
    : {
        autonomic: { score: null, available: false, qualityFactor: 0 } as const,
        sleep: { score: null, available: false, qualityFactor: 0 } as const,
        subjective: { score: null, available: false, qualityFactor: 0 } as const,
        loadContext: { score: 75, available: true, qualityFactor: 0.4 } as const,
      };

  // ── Synthesis ─────────────────────────────────────────────────────────────
  const synthesis = synthesizeScore({
    autonomic: dims.autonomic,
    sleep: dims.sleep,
    subjective: dims.subjective,
    loadContext: dims.loadContext,
  });

  // ── Confidence factors ─────────────────────────────────────────────────────
  const maturity = recovery ? baselineMaturityFactor(recovery) : 0.4;
  const { factor: consistency, dissonanceDetected } = signalConsistencyFactor(
    dims.autonomic.score,
    dims.sleep.score,
    dims.subjective.score,
  );

  // Adjust for dissonance direction
  let dissonanceType: 'OBJECTIVE_POOR_SUBJECTIVE_GOOD' | 'OBJECTIVE_GOOD_SUBJECTIVE_POOR' | 'NONE' =
    'NONE';
  if (dissonanceDetected && dims.autonomic.score !== null && dims.subjective.score !== null) {
    const objAvg = [dims.autonomic.score, dims.sleep.score].filter((s): s is number => s !== null);
    const objectiveAvg = objAvg.reduce((a, b) => a + b, 0) / objAvg.length;
    dissonanceType =
      objectiveAvg > dims.subjective.score
        ? 'OBJECTIVE_GOOD_SUBJECTIVE_POOR'
        : 'OBJECTIVE_POOR_SUBJECTIVE_GOOD';
  }

  const finalConfidence =
    Math.round(Math.min(synthesis.confidence * maturity * consistency, 1.0) * 100) / 100;

  // ── Score adjustment for dissonance ───────────────────────────────────────
  // Per RECOVERY_MODEL.md §9.1: conservative bias when "objective poor, subjective good"
  let finalScore = synthesis.score;
  if (finalScore !== null && dissonanceType === 'OBJECTIVE_POOR_SUBJECTIVE_GOOD') {
    finalScore = Math.round(finalScore * 0.9);
  }

  // ── ReadinessCategory ─────────────────────────────────────────────────────
  const category = mapScoreToCategory(finalScore, synthesis.availableCount);

  // ── Illness risk detection ─────────────────────────────────────────────────
  const illnessRisk: IllnessRisk = recovery ? computeIllnessRisk(recovery, load) : 'LOW';

  // Override to VERY_LOW when illness risk is HIGH
  const effectiveScore = capScoreForHighIllnessRisk(illnessRisk, finalScore);

  const effectiveCategory: ReadinessCategory = illnessRisk === 'HIGH' ? 'VERY_LOW' : category;

  // ── Signals ───────────────────────────────────────────────────────────────
  const overreachingRisk = computeOverreachingRisk(
    dims.autonomic.score,
    dims.sleep.score,
    dims.subjective.score,
    dims.loadContext.score,
  );

  const signals: RecoverySignals = {
    autonomicBalance: classifyAutonomicBalance(dims.autonomic.score),
    sleepAdequacy: classifySleepAdequacy(dims.sleep.score),
    subjectiveWellness: classifySubjectiveWellness(dims.subjective.score),
    loadStressContext: classifyLoadContext(dims.loadContext.score),
    overreachingRisk,
    illnessRisk,
    dissonanceDetected,
  };

  // ── Data completeness ─────────────────────────────────────────────────────
  const { availableCount } = synthesis;
  const completeness = classifyDataCompleteness(availableCount);

  // ── Dimension results (for Digital Twin) ──────────────────────────────────
  const dimensionResults: RecoveryState['dimensions'] = {
    autonomic: {
      score: dims.autonomic.score,
      status: signals.autonomicBalance,
      available: dims.autonomic.available,
    },
    sleep: {
      score: dims.sleep.score,
      status: signals.sleepAdequacy,
      available: dims.sleep.available,
    },
    subjective: {
      score: dims.subjective.score,
      status: signals.subjectiveWellness,
      available: dims.subjective.available,
    },
    loadContext: {
      score: dims.loadContext.score,
      status: signals.loadStressContext,
      available: dims.loadContext.available,
    },
  };

  // ── Primary limiting factor ───────────────────────────────────────────────
  const limitingFactor = findPrimaryLimitingFactor({
    autonomic: dims.autonomic.score,
    sleep: dims.sleep.score,
    subjective: dims.subjective.score,
    loadContext: dims.loadContext.score,
  });

  // ── RecoveryState (for Digital Twin update) ───────────────────────────────
  const recoveryState: RecoveryState = {
    readinessScore: effectiveScore,
    readinessCategory: effectiveCategory,
    dimensions: dimensionResults,
    primaryLimitingFactor: limitingFactor,
    estimatedTimeToFullRecovery: estimateTimeToFullRecovery(effectiveScore),
    overreachingRisk,
    illnessRisk,
    dissonanceDetected,
    confidence: finalConfidence,
    dataCompleteness: completeness,
    modelId: 'recovery-synthesis-v1',
    computedAt: new Date(),
    trainingDayId: context.trainingDayId,
  };

  // ── Decision ──────────────────────────────────────────────────────────────
  const decision = makeDecision(effectiveCategory, signals, dissonanceType);

  // ── Recommendation ────────────────────────────────────────────────────────
  const recommendation = makeRecommendation(decision, effectiveScore, finalConfidence);

  return {
    signals,
    recoveryState,
    decision,
    recommendation,
  };
}
