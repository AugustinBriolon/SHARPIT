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
import { isSet } from '@/lib/util/value';
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
import { applyEnvironmentalImpactToReadiness } from '@/core/inference/environment/apply-impact';
import { applyWearableEnergyCorroboration } from './wearable-energy';

// ─────────────────────────────────────────────────────────────────────────────
// Signals
// ─────────────────────────────────────────────────────────────────────────────

function classifyAutonomicBalance(score: number | null): RecoverySignals['autonomicBalance'] {
  if (score === undefined || score === null) {
    return 'SUPPRESSED';
  } // treat unknown as suppressed (conservative)
  if (score >= 85) {
    return 'ENHANCED';
  }
  if (score >= 65) {
    return 'NORMAL';
  }
  if (score >= 45) {
    return 'MILDLY_SUPPRESSED';
  }
  if (score >= 25) {
    return 'SUPPRESSED';
  }
  return 'CRITICALLY_SUPPRESSED';
}

function classifySleepAdequacy(score: number | null): RecoverySignals['sleepAdequacy'] {
  if (score === undefined || score === null) {
    return 'INSUFFICIENT';
  }
  if (score >= 90) {
    return 'EXCELLENT';
  }
  if (score >= 70) {
    return 'ADEQUATE';
  }
  if (score >= 40) {
    return 'INSUFFICIENT';
  }
  return 'SEVERELY_INSUFFICIENT';
}

function classifySubjectiveWellness(score: number | null): RecoverySignals['subjectiveWellness'] {
  if (score === undefined || score === null) {
    return 'NORMAL';
  } // unknown = neutral
  if (score >= 75) {
    return 'HIGH';
  }
  if (score >= 50) {
    return 'NORMAL';
  }
  if (score >= 25) {
    return 'LOW';
  }
  return 'VERY_LOW';
}

function classifyLoadContext(score: number | null): RecoverySignals['loadStressContext'] {
  if (score === undefined || score === null) {
    return 'OPTIMAL';
  }
  if (score >= 85) {
    return 'UNDERTRAINED';
  }
  if (score >= 75) {
    return 'OPTIMAL';
  }
  if (score >= 55) {
    return 'ELEVATED';
  }
  if (score >= 25) {
    return 'HIGH';
  }
  return 'CRITICAL';
}

function computeOverreachingRisk(
  autonomic: number | null,
  sleep: number | null,
  subjective: number | null,
  loadContext: number | null,
): OverreachingRisk {
  const scores = [autonomic, sleep, subjective, loadContext].filter((s): s is number => isSet(s));

  // CRITICAL: 3+ dimensions < 30 (OTS territory — Meeusen et al. 2013)
  if (scores.filter((s) => s < 30).length >= 3) {
    return 'CRITICAL';
  }

  // HIGH: autonomic < 30 AND sleep < 40 simultaneously (autonomic + sleep crisis)
  if (isSet(autonomic) && autonomic < 30 && isSet(sleep) && sleep < 40) {
    return 'HIGH';
  }

  // MODERATE: any 2 primary dimensions < 45
  const primaryScores = [autonomic, sleep, subjective].filter((s): s is number => isSet(s));
  if (primaryScores.filter((s) => s < 45).length >= 2) {
    return 'MODERATE';
  }

  return 'LOW';
}

function illnessRiskFromHrvDrop(
  hrvDeltaFromBaseline: number,
  acuteLoad: number | null,
  chronicLoad: number | null,
): IllnessRisk | null {
  if (
    hrvDeltaFromBaseline < -30 &&
    isSet(acuteLoad) &&
    isSet(chronicLoad) &&
    acuteLoad < chronicLoad * 0.7
  ) {
    return 'HIGH';
  }
  if (hrvDeltaFromBaseline < -20) {
    return 'ELEVATED';
  }
  return null;
}

function computeIllnessRisk(
  recovery: RecoveryFeatureSet,
  load: LoadFeatureSet | 'PENDING',
): IllnessRisk {
  const { hrvDeltaFromBaseline } = recovery;
  if (hrvDeltaFromBaseline === undefined || hrvDeltaFromBaseline === null) {
    return 'LOW';
  }

  const acuteLoad = load !== 'PENDING' ? load.acuteLoad : null;
  const chronicLoad = load !== 'PENDING' ? load.chronicLoad : null;
  return illnessRiskFromHrvDrop(hrvDeltaFromBaseline, acuteLoad, chronicLoad) ?? 'LOW';
}

// ─────────────────────────────────────────────────────────────────────────────
// ReadinessCategory mapping
// ─────────────────────────────────────────────────────────────────────────────

function mapScoreToCategory(score: number | null, availableCount: number): ReadinessCategory {
  if (score === undefined || score === null) {
    return availableCount === 0 ? 'INSUFFICIENT_DATA' : 'BASELINE_PENDING';
  }
  if (score >= 85) {
    return 'OPTIMAL';
  }
  if (score >= 70) {
    return 'ADEQUATE';
  }
  if (score >= 50) {
    return 'REDUCED';
  }
  if (score >= 30) {
    return 'LOW';
  }
  return 'VERY_LOW';
}

function capScoreForHighIllnessRisk(
  illnessRisk: IllnessRisk,
  finalScore: number | null,
): number | null {
  if (illnessRisk !== 'HIGH') {
    return finalScore;
  }
  if (finalScore === undefined || finalScore === null) {
    return 25;
  }
  return Math.min(finalScore, 25);
}

function classifyDataCompleteness(availableCount: number): DataCompleteness {
  if (availableCount >= 4) {
    return 'FULL';
  }
  if (availableCount >= 2) {
    return 'PARTIAL';
  }
  if (availableCount === 1) {
    return 'SPARSE';
  }
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
  const available = entries.filter(([, s]) => isSet(s));
  if (available.length === 0) {
    return null;
  }

  return available.reduce((lowest, [key, score]) => {
    const lowestScore = scores[lowest];
    return isSet(score) &&
      (lowestScore === undefined || lowestScore === null || score < (lowestScore ?? Infinity))
      ? key
      : lowest;
  }, available[0][0]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Decision
// ─────────────────────────────────────────────────────────────────────────────

type CategoryDecision = Pick<RecoveryDecision, 'verdict' | 'recommendedIntensity' | 'rationale'>;

const CATEGORY_DECISIONS: Record<ReadinessCategory, CategoryDecision> = {
  OPTIMAL: {
    verdict: 'RECOVERED',
    recommendedIntensity: 'MODERATE',
    rationale: [{ code: 'recovery.rationale.excellent' }],
  },
  ADEQUATE: {
    verdict: 'PARTIALLY_RECOVERED',
    recommendedIntensity: 'MODERATE',
    rationale: [{ code: 'recovery.rationale.good' }],
  },
  REDUCED: {
    verdict: 'PARTIALLY_RECOVERED',
    recommendedIntensity: 'EASY',
    rationale: [{ code: 'recovery.rationale.partial' }],
  },
  LOW: {
    verdict: 'FATIGUED',
    recommendedIntensity: 'VERY_EASY',
    rationale: [{ code: 'recovery.rationale.incomplete' }],
  },
  VERY_LOW: {
    verdict: 'FATIGUED',
    recommendedIntensity: 'REST',
    rationale: [{ code: 'recovery.rationale.insufficient' }],
  },
  BASELINE_PENDING: {
    verdict: 'INSUFFICIENT_DATA',
    recommendedIntensity: 'EASY',
    rationale: [{ code: 'recovery.rationale.noData' }],
  },
  INSUFFICIENT_DATA: {
    verdict: 'INSUFFICIENT_DATA',
    recommendedIntensity: 'EASY',
    rationale: [{ code: 'recovery.rationale.noData' }],
  },
};

function optimalIntensity(
  signals: RecoverySignals,
  dissonanceType: 'OBJECTIVE_POOR_SUBJECTIVE_GOOD' | 'OBJECTIVE_GOOD_SUBJECTIVE_POOR' | 'NONE',
): RecommendedIntensity {
  if (signals.overreachingRisk === 'LOW' && dissonanceType !== 'OBJECTIVE_POOR_SUBJECTIVE_GOOD') {
    return 'HARD';
  }
  return 'MODERATE';
}

function appendSignalRationale(rationale: I18nItem[], signals: RecoverySignals): void {
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
}

function makeDecision(
  category: ReadinessCategory,
  signals: RecoverySignals,
  dissonanceType: 'OBJECTIVE_POOR_SUBJECTIVE_GOOD' | 'OBJECTIVE_GOOD_SUBJECTIVE_POOR' | 'NONE',
): RecoveryDecision {
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

  const base = CATEGORY_DECISIONS[category];
  const rationale = [...base.rationale];
  const recommendedIntensity =
    category === 'OPTIMAL' ? optimalIntensity(signals, dissonanceType) : base.recommendedIntensity;

  appendSignalRationale(rationale, signals);

  return {
    verdict: base.verdict,
    recommendedIntensity,
    rationale: rationale.slice(0, 3),
  };
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
  if (isSet(score)) {
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
  if (score === undefined || score === null || score >= 70) {
    return null;
  } // already recovered
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
function resolveDissonanceType(
  dissonanceDetected: boolean,
  autonomicScore: number | null,
  sleepScore: number | null,
  subjectiveScore: number | null,
): 'OBJECTIVE_POOR_SUBJECTIVE_GOOD' | 'OBJECTIVE_GOOD_SUBJECTIVE_POOR' | 'NONE' {
  if (
    !dissonanceDetected ||
    autonomicScore === undefined ||
    autonomicScore === null ||
    subjectiveScore === undefined ||
    subjectiveScore === null
  ) {
    return 'NONE';
  }

  const objectiveScores = [autonomicScore, sleepScore].filter((s): s is number => isSet(s));
  const objectiveAvg = objectiveScores.reduce((a, b) => a + b, 0) / objectiveScores.length;
  return objectiveAvg > subjectiveScore
    ? 'OBJECTIVE_GOOD_SUBJECTIVE_POOR'
    : 'OBJECTIVE_POOR_SUBJECTIVE_GOOD';
}

function applyDissonanceScoreAdjustment(
  score: number | null,
  dissonanceType: 'OBJECTIVE_POOR_SUBJECTIVE_GOOD' | 'OBJECTIVE_GOOD_SUBJECTIVE_POOR' | 'NONE',
): number | null {
  if (
    score === undefined ||
    score === null ||
    dissonanceType !== 'OBJECTIVE_POOR_SUBJECTIVE_GOOD'
  ) {
    return score;
  }
  return Math.round(score * 0.9);
}

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

  const dissonanceType = resolveDissonanceType(
    dissonanceDetected,
    dims.autonomic.score,
    dims.sleep.score,
    dims.subjective.score,
  );

  const finalConfidence =
    Math.round(Math.min(synthesis.confidence * maturity * consistency, 1.0) * 100) / 100;

  const finalScore = applyDissonanceScoreAdjustment(synthesis.score, dissonanceType);

  const illnessRisk: IllnessRisk = recovery ? computeIllnessRisk(recovery, load) : 'LOW';

  // Soft Garmin stress / Body Battery corroboration (bounded, never primary)
  const wearableAdjusted = applyWearableEnergyCorroboration(
    finalScore,
    context.wearableEnergySignals,
  );

  // Environmental demand, then illness cap — category must follow the final score
  const effectiveScore = capScoreForHighIllnessRisk(
    illnessRisk,
    applyEnvironmentalImpactToReadiness(wearableAdjusted, context.environmentalImpact ?? null),
  );

  const effectiveCategory: ReadinessCategory =
    illnessRisk === 'HIGH'
      ? 'VERY_LOW'
      : mapScoreToCategory(effectiveScore, synthesis.availableCount);

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
