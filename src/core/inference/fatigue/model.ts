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
import { generateFatigueExplanation } from './explanation';

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
    score: fatigueIndex,
    confidence: rawConfidence,
    dataCompleteness,
  } = synthesizeFatigueIndex(dims);

  // Maturity modifier: < 7 days history → 60%, 7-14 → 80%, 14+ → 100%
  const historyDays = context.recentFatigueHistory.length;
  const maturityModifier = historyDays >= 14 ? 1.0 : historyDays >= 7 ? 0.8 : 0.6;
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

  // ── Step 10: Build explanation ────────────────────────────────────────────
  const explanation = generateFatigueExplanation(
    fatigueIndex,
    fatigueLevel,
    signals,
    dims,
    decision,
    confidence,
  );

  // ── Step 11: Build FatigueState ───────────────────────────────────────────
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

  return { signals, fatigueState, decision, recommendation, explanation };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function toDimensionResult(d: import('./types').DimensionScore): DimensionResult {
  return {
    score: d.score,
    available: d.available,
    status: d.available ? (d.score !== null ? `score=${d.score}` : 'computed') : 'unavailable',
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
  const LABELS: Record<import('./types').FatigueDominantDimension, string> = {
    LOAD: 'Elevated training load (ACWR)',
    NEUROMUSCULAR: 'Neuromuscular stress (HRV suppression + mechanical loading)',
    METABOLIC: 'Metabolic depletion (high-intensity session impact)',
    CUMULATIVE: 'Accumulated multi-day fatigue',
    PSYCHOLOGICAL: 'Psychological/motivational fatigue',
  };
  return LABELS[dominant] ?? 'Multiple contributing factors';
}

function buildDecision(
  signals: FatigueSignals,
  dims: ScoredFatigueDimensions,
  load: import('@/core/features/types').LoadFeatureSet | null,
): FatigueDecision {
  const rationale: string[] = [];
  let verdict: FatigueVerdict;
  let capacity: TrainingCapacity = signals.trainingCapacity;

  if (signals.fatigueLevel === 'INSUFFICIENT_DATA') {
    return {
      verdict: 'INSUFFICIENT_DATA',
      trainingCapacity: 'FULL',
      rationale: ['Insufficient data to assess fatigue — connect a training device.'],
    };
  }

  if (signals.functionalOverreachingRisk === 'CRITICAL') {
    verdict = 'REST_WEEK';
    rationale.push('Critical overreaching risk: mandatory extended rest required.');
    rationale.push(
      `${signals.consecutiveAccumulationDays} consecutive days of high fatigue accumulation.`,
    );
  } else if (
    signals.fatigueLevel === 'OVERREACHING_RISK' ||
    signals.fatigueLevel === 'NON_FUNCTIONAL_RISK'
  ) {
    verdict = signals.fatigueLevel === 'OVERREACHING_RISK' ? 'REST_WEEK' : 'REDUCE';
    rationale.push(
      `FatigueIndex ${signals.fatigueLevel.replace('_', ' ').toLowerCase()} — load reduction required.`,
    );
    if (signals.isAccumulating)
      rationale.push('Fatigue is still accumulating — reduce before the trajectory worsens.');
  } else if (signals.fatigueLevel === 'ACCUMULATED') {
    verdict = 'REDUCE';
    rationale.push('Accumulated fatigue exceeds normal training levels — reduce intensity.');
    if (signals.estimatedTimeToFresh !== null) {
      rationale.push(`Estimated ${signals.estimatedTimeToFresh} day(s) to return to fresh state.`);
    }
  } else if (signals.fatigueLevel === 'FUNCTIONAL_HIGH') {
    verdict = 'MAINTAIN';
    rationale.push('Productive training state — load is challenging but manageable.');
    if (signals.fatigueTrajectory === 'ACCUMULATING') {
      verdict = 'REDUCE';
      rationale.push('Fatigue is increasing — avoid adding load this week.');
    }
  } else if (signals.fatigueLevel === 'FUNCTIONAL_LOW') {
    verdict = 'MAINTAIN';
    const isRising =
      signals.fatigueTrajectory === 'ACCUMULATING' || signals.fatigueTrajectory === 'ACCELERATING';
    if (load?.acwr !== null && load?.acwr !== undefined && load.acwr < 0.8 && !isRising) {
      verdict = 'BUILD';
      rationale.push(
        'Training load is below optimal — this is a window to increase volume safely.',
      );
    } else {
      rationale.push('Normal training fatigue — maintain current load.');
    }
  } else {
    // FRESH or INSUFFICIENT_DATA handled above
    verdict = 'BUILD';
    rationale.push('Low fatigue — this is an ideal window to increase training stimulus.');
    if (load?.acwr !== null && load?.acwr !== undefined && load.acwr > 1.2) {
      verdict = 'MAINTAIN';
      rationale[0] =
        'Low fatigue but load ratio is already elevated — maintain rather than build further.';
    }
  }

  // Secondary rationale points
  if (signals.fatigueType === 'NEUROMUSCULAR_DOMINANT' && rationale.length < 3) {
    rationale.push('Neuromuscular fatigue is the primary concern — avoid high-impact sessions.');
  }
  if (signals.fatigueType === 'METABOLIC_DOMINANT' && rationale.length < 3) {
    rationale.push('High anaerobic load today — metabolic recovery is the priority.');
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
  const TITLES: Record<FatigueVerdict, string> = {
    BUILD: 'Build phase — increase training load',
    MAINTAIN: 'Maintain — sustain current training load',
    REDUCE: 'Reduce load — fatigue accumulation detected',
    REST_WEEK: 'Full deload week — mandatory rest required',
    TAPER: 'Taper — race preparation phase',
    INSUFFICIENT_DATA: 'Connect a training device for fatigue assessment',
  };

  const SUMMARIES: Record<FatigueVerdict, string> = {
    BUILD:
      'Your fatigue level is low and your training capacity is full. This is the optimal window to increase training stimulus for adaptation.',
    MAINTAIN:
      'You are in a productive training state. Fatigue is manageable — sustain your current load without adding volume or intensity.',
    REDUCE:
      'Accumulated fatigue is limiting your training capacity. Reduce intensity and/or volume this week to allow recovery to catch up.',
    REST_WEEK:
      'Your fatigue indicators suggest non-functional overreaching. A full deload week (no structured training or only light active recovery) is required.',
    TAPER:
      'Reduce training volume while maintaining some intensity to allow fatigue to dissipate and fitness to emerge. Race form is the objective.',
    INSUFFICIENT_DATA:
      'Connect a heart rate monitor and log training sessions to enable personalized fatigue assessment.',
  };

  const keyEvidence: string[] = [signals.primaryLimitingFactor];
  if (signals.estimatedTimeToFresh !== null) {
    keyEvidence.push(`Estimated ${signals.estimatedTimeToFresh} day(s) to reach fresh state`);
  }
  if (signals.performanceImpairmentEstimate > 0.1) {
    keyEvidence.push(
      `Performance capacity estimated at ~${Math.round((1 - signals.performanceImpairmentEstimate) * 100)}% of maximum`,
    );
  }

  return {
    type: decision.verdict,
    title: TITLES[decision.verdict],
    summary: SUMMARIES[decision.verdict],
    keyEvidence: keyEvidence.slice(0, 3),
    confidence,
    limitingFactor:
      signals.fatigueLevel !== 'FRESH' && signals.fatigueLevel !== 'INSUFFICIENT_DATA'
        ? signals.primaryLimitingFactor
        : null,
  };
}
