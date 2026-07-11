/**
 * FATIGUE MODEL v1 — Inference Function
 *
 * The single entry point for Fatigue Intelligence inference.
 * This function is PURE: no side effects, no database calls, no randomness.
 *
 * Pipeline:
 *   1. Score five fatigue dimensions from DayFeatures + context
 *   2. Apply dissonance bias correction if needed
 *   3. Synthesize FatigueIndex from available dimensions
 *   4. Classify FatigueLevel, FatigueType, FatigueTrajectory
 *   5. Compute signals, decision, recommendation, explanation
 *   6. Build FatigueState for Digital Twin update
 *
 * References: docs/models/FATIGUE_MODEL.md
 * Model ID: 'fatigue-v1'
 */

import type { DayFeatures } from '@/core/features/types';
import type {
  FatigueModelContext,
  FatigueModelOutput,
  FatigueState,
  FatigueSignals,
  FatigueDecision,
  FatigueRecommendation,
  DimensionResult,
  ScoredFatigueDimensions,
  FatigueVerdict,
  TrainingCapacity,
} from './types';
import type { OverreachingRisk } from '@/core/digital-twin/types';
import { applyEnvironmentalImpactToFatigueIndex } from '@/core/inference/environment/apply-impact';
import {
  scoreLoadFatigue,
  scoreNeuromuscularFatigue,
  scoreMetabolicFatigue,
  scoreCumulativeTrajectory,
  scorePsychologicalFatigue,
  synthesizeFatigueIndex,
  classifyFatigueLevel,
  classifyFatigueType,
  getDominantDimension,
  classifyTrainingCapacity,
  computeFatigueTrajectory,
  estimateTimeToFresh,
  applyDissonanceBias,
} from './scoring';
import type { I18nItem } from '@/core/inference/shared/types';

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export function runFatigueModel(
  features: DayFeatures,
  context: FatigueModelContext,
): FatigueModelOutput {
  const computedAt = new Date();

  const load = features.load !== 'PENDING' ? features.load : null;
  const recovery = features.recovery !== 'PENDING' ? features.recovery : null;
  const condition = features.condition !== 'PENDING' ? features.condition : null;

  // ── Step 1: Score each dimension ─────────────────────────────────────────
  let dims: ScoredFatigueDimensions = {
    load: scoreLoadFatigue(features.load),
    neuromuscular: scoreNeuromuscularFatigue(
      features.recovery,
      context.recoveryState,
      features.sessions,
    ),
    metabolic: scoreMetabolicFatigue(features.sessions),
    cumulative: scoreCumulativeTrajectory(
      context.consecutiveAccumulationDays,
      recovery?.sleepDebtMin ?? null,
      context.recoveryState?.dissonanceDetected ?? false,
    ),
    psychological: scorePsychologicalFatigue(features.recovery),
  };

  // ── Step 2: Apply dissonance bias correction ────────────────────────────
  dims = applyDissonanceBias(
    dims,
    context.consecutiveAccumulationDays,
    context.recoveryState?.dissonanceDetected ?? false,
  );

  // ── Step 3: Synthesize FatigueIndex ──────────────────────────────────────
  const {
    score: rawFatigueIndex,
    confidence: rawConfidence,
    dataCompleteness,
  } = synthesizeFatigueIndex(dims);

  const fatigueIndex = applyEnvironmentalImpactToFatigueIndex(
    rawFatigueIndex,
    context.environmentalImpact ?? null,
  );

  // Maturity modifier: < 7 days history → 60%, 7-14 → 80%, 14+ → 100%
  const historyDays = context.recentFatigueHistory.length;
  const maturityModifier = fatigueHistoryMaturityModifier(historyDays);
  const confidence = rawConfidence * maturityModifier;

  // ── Step 4: Classify ──────────────────────────────────────────────────────
  const fatigueLevel = classifyFatigueLevel(fatigueIndex);
  const fatigueType = classifyFatigueType(dims);
  const dominantDimension = getDominantDimension(dims);
  const trajectory = computeFatigueTrajectory(context.recentFatigueHistory);

  const trainingBlockedByCondition = condition?.trainingBlockedByCondition ?? false;
  const trainingCapacity = classifyTrainingCapacity(fatigueLevel, trainingBlockedByCondition);

  const estimatedTimeToFresh = estimateTimeToFresh(dims, fatigueLevel);
  const performanceImpairmentEstimate =
    fatigueIndex !== null ? Math.min((fatigueIndex / 100) * 0.25, 0.25) : 0;

  // ── Step 5: Compute overreaching risk ─────────────────────────────────────
  const functionalOverreachingRisk = computeOverreachingRisk(
    fatigueIndex,
    trajectory,
    context.recoveryState,
    context.consecutiveAccumulationDays,
  );

  // ── Step 6: Primary limiting factor ──────────────────────────────────────
  const primaryLimitingFactor = buildPrimaryLimitingFactor(dims, dominantDimension);

  // ── Step 7: Build signals ─────────────────────────────────────────────────
  const signals: FatigueSignals = {
    fatigueLevel,
    fatigueType,
    fatigueTrajectory: trajectory,
    dominantFatigueDimension: dominantDimension,
    primaryLimitingFactor,
    functionalOverreachingRisk,
    estimatedTimeToFresh,
    performanceImpairmentEstimate,
    trainingCapacity,
    isAccumulating: trajectory === 'ACCUMULATING' || trajectory === 'ACCELERATING',
    consecutiveAccumulationDays: context.consecutiveAccumulationDays,
  };

  // ── Step 8: Build decision ────────────────────────────────────────────────
  const decision = buildDecision(signals, dims, load);

  // ── Step 9: Build recommendation ─────────────────────────────────────────
  const recommendation = buildRecommendation(signals, decision, confidence);

  // ── Step 10: Build FatigueState ───────────────────────────────────────────
  const fatigueState: FatigueState = {
    fatigueIndex,
    fatigueLevel,
    fatigueType,
    dimensions: {
      load: toDimensionResult(dims.load),
      neuromuscular: toDimensionResult(dims.neuromuscular),
      metabolic: toDimensionResult(dims.metabolic),
      cumulative: toDimensionResult(dims.cumulative),
      psychological: toDimensionResult(dims.psychological),
    },
    trajectory,
    consecutiveAccumulationDays: context.consecutiveAccumulationDays,
    dominantDimension,
    primaryLimitingFactor,
    functionalOverreachingRisk,
    estimatedTimeToFresh,
    performanceImpairmentEstimate,
    trainingCapacity,
    confidence,
    dataCompleteness,
    modelId: 'fatigue-v1',
    computedAt,
    trainingDayId: context.trainingDayId,
  };

  return { signals, fatigueState, decision, recommendation };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function fatigueHistoryMaturityModifier(historyDays: number): number {
  if (historyDays >= 14) return 1.0;
  if (historyDays >= 7) return 0.8;
  return 0.6;
}

function dimensionResultStatus(d: import('./types').DimensionScore): string {
  if (!d.available) return 'unavailable';
  if (d.score !== null) return `score=${d.score}`;
  return 'computed';
}

function toDimensionResult(d: import('./types').DimensionScore): DimensionResult {
  return {
    score: d.score,
    available: d.available,
    status: dimensionResultStatus(d),
  };
}

function computeOverreachingRisk(
  fatigueIndex: number | null,
  trajectory: import('./types').FatigueTrajectory,
  recoveryState: import('./types').RecoveryState | null,
  consecutiveDays: number,
): OverreachingRisk {
  if (fatigueIndex === null) return 'LOW';

  // Guard: illness-driven fatigue should not trigger overreaching classification
  if (recoveryState?.illnessRisk === 'HIGH') return 'LOW';

  // CRITICAL: severe fatigue + poor recovery + declining for many days
  if (
    fatigueIndex > 80 &&
    (recoveryState?.readinessCategory === 'LOW' ||
      recoveryState?.readinessCategory === 'VERY_LOW') &&
    consecutiveDays >= 5
  )
    return 'CRITICAL';

  // HIGH: significant fatigue, accumulating trend, autonomic suppression
  if (
    fatigueIndex > 65 &&
    (trajectory === 'ACCUMULATING' || trajectory === 'ACCELERATING') &&
    (recoveryState?.dimensions?.autonomic?.score ?? 100) < 50
  )
    return 'HIGH';

  // MODERATE: accumulated fatigue with ongoing accumulation
  if (fatigueIndex > 55 && (trajectory === 'ACCUMULATING' || trajectory === 'ACCELERATING')) {
    return consecutiveDays >= 4 ? 'HIGH' : 'MODERATE';
  }

  return 'LOW';
}

function buildPrimaryLimitingFactor(
  dims: ScoredFatigueDimensions,
  dominant: import('./types').FatigueDominantDimension,
): string {
  const CODES: Record<import('./types').FatigueDominantDimension, string> = {
    LOAD: 'fatigue.primaryLimitingFactor.load',
    NEUROMUSCULAR: 'fatigue.primaryLimitingFactor.neuromuscular',
    METABOLIC: 'fatigue.primaryLimitingFactor.metabolic',
    CUMULATIVE: 'fatigue.primaryLimitingFactor.cumulative',
    PSYCHOLOGICAL: 'fatigue.primaryLimitingFactor.psychological',
  };
  return CODES[dominant] ?? 'fatigue.primaryLimitingFactor.multiple';
}

function buildDecision(
  signals: FatigueSignals,
  dims: ScoredFatigueDimensions,
  load: import('@/core/features/types').LoadFeatureSet | null,
): FatigueDecision {
  const rationale: I18nItem[] = [];
  let verdict: FatigueVerdict;
  const capacity: TrainingCapacity = signals.trainingCapacity;

  if (signals.fatigueLevel === 'INSUFFICIENT_DATA') {
    return {
      verdict: 'INSUFFICIENT_DATA',
      trainingCapacity: 'FULL',
      rationale: [{ code: 'fatigue.rationale.noData' }],
    };
  }

  if (signals.functionalOverreachingRisk === 'CRITICAL') {
    verdict = 'REST_WEEK';
    rationale.push({ code: 'fatigue.rationale.criticalOverreaching' });
    rationale.push({
      code: 'fatigue.rationale.consecutiveDays',
      params: { days: signals.consecutiveAccumulationDays },
    });
  } else if (
    signals.fatigueLevel === 'OVERREACHING_RISK' ||
    signals.fatigueLevel === 'NON_FUNCTIONAL_RISK'
  ) {
    verdict = signals.fatigueLevel === 'OVERREACHING_RISK' ? 'REST_WEEK' : 'REDUCE';
    rationale.push({ code: 'fatigue.rationale.loadReductionRequired' });
    if (signals.isAccumulating) rationale.push({ code: 'fatigue.rationale.stillAccumulating' });
  } else if (signals.fatigueLevel === 'ACCUMULATED') {
    verdict = 'REDUCE';
    rationale.push({ code: 'fatigue.rationale.accumulatedFatigue' });
    if (signals.estimatedTimeToFresh !== null) {
      rationale.push({
        code: 'fatigue.rationale.estimatedFresh',
        params: { days: signals.estimatedTimeToFresh },
      });
    }
  } else if (signals.fatigueLevel === 'FUNCTIONAL_HIGH') {
    verdict = 'MAINTAIN';
    rationale.push({ code: 'fatigue.rationale.productiveState' });
    if (signals.fatigueTrajectory === 'ACCUMULATING') {
      verdict = 'REDUCE';
      rationale.push({ code: 'fatigue.rationale.avoidAddingLoad' });
    }
  } else if (signals.fatigueLevel === 'FUNCTIONAL_LOW') {
    verdict = 'MAINTAIN';
    const isRising =
      signals.fatigueTrajectory === 'ACCUMULATING' || signals.fatigueTrajectory === 'ACCELERATING';
    if (load?.acwr !== null && load?.acwr !== undefined && load.acwr < 0.8 && !isRising) {
      verdict = 'BUILD';
      rationale.push({ code: 'fatigue.rationale.loadBelowOptimal' });
    } else {
      rationale.push({ code: 'fatigue.rationale.maintainCurrent' });
    }
  } else {
    verdict = 'BUILD';
    rationale.push({ code: 'fatigue.rationale.lowFatigue' });
    if (load?.acwr !== null && load?.acwr !== undefined && load.acwr > 1.2) {
      verdict = 'MAINTAIN';
      rationale[0] = { code: 'fatigue.rationale.loadRatioElevated' };
    }
  }

  if (signals.fatigueType === 'NEUROMUSCULAR_DOMINANT' && rationale.length < 3) {
    rationale.push({ code: 'fatigue.rationale.neuromuscularDominant' });
  }
  if (signals.fatigueType === 'METABOLIC_DOMINANT' && rationale.length < 3) {
    rationale.push({ code: 'fatigue.rationale.metabolicDominant' });
  }

  return {
    verdict,
    trainingCapacity: capacity,
    rationale: rationale.slice(0, 3),
  };
}

function buildRecommendation(
  signals: FatigueSignals,
  decision: FatigueDecision,
  confidence: number,
): FatigueRecommendation {
  const keyEvidence: I18nItem[] = [
    {
      code: 'fatigue.evidence.limitingFactor',
      params: { dimension: signals.dominantFatigueDimension },
    },
  ];
  if (signals.estimatedTimeToFresh !== null) {
    keyEvidence.push({
      code: 'fatigue.evidence.timeToFresh',
      params: { days: signals.estimatedTimeToFresh },
    });
  }
  if (signals.performanceImpairmentEstimate > 0.1) {
    keyEvidence.push({
      code: 'fatigue.evidence.performanceCapacity',
      params: { pct: Math.round((1 - signals.performanceImpairmentEstimate) * 100) },
    });
  }

  return {
    type: decision.verdict,
    keyEvidence: keyEvidence.slice(0, 3),
    confidence,
  };
}
