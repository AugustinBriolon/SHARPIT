/**
 * ADAPTATION MODEL v1 — Inference Function
 *
 * The single entry point for Adaptation Intelligence inference.
 * This function is PURE: no side effects, no database calls, no randomness.
 *
 * Pipeline:
 *   1. Score four adaptation dimensions from DayFeatures + context
 *   2. Synthesize AdaptationIndex from available dimensions
 *   3. Classify AdaptationStatus and AdaptationTrend
 *   4. Detect flags (plateauRisk, overreachingWithoutAdaptationDetected)
 *   5. Estimate adaptation peak
 *   6. Build signals
 *   7. Make decision (verdict + loadMultiplier)
 *   8. Generate recommendation
 *   9. Build AdaptationState for Digital Twin update
 *  10. Generate explanation
 *
 * References: docs/models/ADAPTATION_MODEL.md
 * Model ID: 'adaptation-v1'
 */

import type { DayFeatures } from '@/core/features/types';
import type {
  AdaptationModelContext,
  AdaptationModelOutput,
  AdaptationSignals,
  AdaptationDecision,
  AdaptationRecommendation,
  AdaptationVerdict,
  ScoredAdaptationDimensions,
  DimensionScore,
} from './types';
import type { AdaptationState, DimensionResult } from '@/core/digital-twin/types';
import {
  scoreLoadProgression,
  scoreNeuromuscularEfficiency,
  scoreAutonomicAdaptation,
  scoreRecoveryQuality,
  synthesizeAdaptationIndex,
  classifyAdaptationStatus,
  computeAdaptationTrend,
} from './scoring';
import { generateAdaptationExplanation } from './explanation';

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export function runAdaptationModel(
  features: DayFeatures,
  context: AdaptationModelContext,
): AdaptationModelOutput {
  const computedAt = new Date();

  // ── Step 1: Score four dimensions ─────────────────────────────────────────
  const dims: ScoredAdaptationDimensions = {
    loadProgression: scoreLoadProgression(features.load),
    neuromuscularEfficiency: scoreNeuromuscularEfficiency(features.sessions),
    autonomicAdaptation: scoreAutonomicAdaptation(features.recovery),
    recoveryQuality: scoreRecoveryQuality(context.recoveryState, context.fatigueState),
  };

  // ── Step 2: Synthesize AdaptationIndex ────────────────────────────────────
  const {
    score: rawIndex,
    confidence: baseConfidence,
    dataCompleteness,
    availableDimensionCount,
    totalAvailableWeight,
  } = synthesizeAdaptationIndex(dims);

  const historyLength = context.recentAdaptationHistory.length;

  // History maturity bonus: +15% at 28 records; see ADAPTATION_MODEL.md §7
  const historyBonus = Math.min(historyLength / 28, 1.0) * 0.15;
  let confidence = Math.min(baseConfidence + historyBonus, 1.0);
  if (historyLength < 7) confidence = Math.min(confidence, 0.5);
  if (dataCompleteness === 'INSUFFICIENT') confidence = 0.1;

  // ── Step 3: Classify ──────────────────────────────────────────────────────
  const adaptationStatus =
    rawIndex === null ? 'INSUFFICIENT_DATA' : classifyAdaptationStatus(rawIndex);

  const adaptationTrend = computeAdaptationTrend(context.recentAdaptationHistory);

  // ── Step 4: Detect flags ──────────────────────────────────────────────────
  const plateauRisk = detectPlateauRisk(
    dims.loadProgression,
    adaptationStatus,
    context.recentAdaptationHistory,
  );

  const overreachingWithoutAdaptationDetected = detectOverreachingWithoutAdaptation(
    context.fatigueState,
    dims.autonomicAdaptation,
    dims.recoveryQuality,
  );

  if (overreachingWithoutAdaptationDetected) {
    confidence = Math.min(confidence, 0.75);
  }

  // ── Step 5: Estimate adaptation peak ─────────────────────────────────────
  const estimatedAdaptationPeak = estimateAdaptationPeak(adaptationStatus, adaptationTrend);

  // ── Step 6: Limiting factor ───────────────────────────────────────────────
  const limitingFactor = findLimitingFactor(dims);

  // ── Step 7: Build signals ─────────────────────────────────────────────────
  const signals: AdaptationSignals = {
    adaptationIndex: rawIndex,
    adaptationStatus,
    adaptationTrend,
    dimensionScores: {
      loadProgression: dims.loadProgression.score,
      neuromuscularEfficiency: dims.neuromuscularEfficiency.score,
      autonomicAdaptation: dims.autonomicAdaptation.score,
      recoveryQuality: dims.recoveryQuality.score,
    },
    plateauRisk,
    overreachingWithoutAdaptationDetected,
    availableDimensionCount,
    totalAvailableWeight,
    confidence,
    historyLength,
  };

  // ── Step 8: Build decision ────────────────────────────────────────────────
  const decision = buildDecision(
    adaptationStatus,
    context.fatigueState?.trainingCapacity ?? null,
    plateauRisk,
    overreachingWithoutAdaptationDetected,
    dims,
  );

  // ── Step 9: Build recommendation ─────────────────────────────────────────
  const recommendation = buildRecommendation(decision, signals, limitingFactor);

  // ── Step 10: Build AdaptationState ────────────────────────────────────────
  const adaptationState: AdaptationState = {
    adaptationIndex: rawIndex,
    adaptationStatus,
    adaptationTrend,
    dimensions: {
      loadProgression: toDimensionResult(dims.loadProgression),
      neuromuscularEfficiency: toDimensionResult(dims.neuromuscularEfficiency),
      autonomicAdaptation: toDimensionResult(dims.autonomicAdaptation),
      recoveryQuality: toDimensionResult(dims.recoveryQuality),
    },
    limitingFactor,
    estimatedAdaptationPeak,
    plateauRisk,
    overreachingWithoutAdaptationDetected,
    confidence,
    dataCompleteness,
    modelId: 'adaptation-v1',
    computedAt,
    trainingDayId: context.trainingDayId,
  };

  // ── Step 11: Build explanation ────────────────────────────────────────────
  const explanation = generateAdaptationExplanation(adaptationState, decision, signals);

  return { signals, adaptationState, decision, recommendation, explanation };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function toDimensionResult(d: DimensionScore): DimensionResult {
  return {
    score: d.score,
    available: d.available,
    status: d.available ? (d.score !== null ? `score=${d.score}` : 'computed') : 'unavailable',
  };
}

function findLimitingFactor(dims: ScoredAdaptationDimensions): AdaptationState['limitingFactor'] {
  const candidates = [
    { key: 'loadProgression' as const, score: dims.loadProgression.score },
    { key: 'neuromuscularEfficiency' as const, score: dims.neuromuscularEfficiency.score },
    { key: 'autonomicAdaptation' as const, score: dims.autonomicAdaptation.score },
    { key: 'recoveryQuality' as const, score: dims.recoveryQuality.score },
  ].filter((c) => c.score !== null) as Array<{
    key: keyof ScoredAdaptationDimensions;
    score: number;
  }>;

  if (candidates.length === 0) return null;
  return candidates.reduce((min, c) => (c.score < min.score ? c : min)).key;
}

function detectPlateauRisk(
  loadDim: DimensionScore,
  status: AdaptationState['adaptationStatus'],
  history: readonly number[],
): boolean {
  if (history.length < 14) return false;
  if (status !== 'PLATEAUING') return false;
  if (!loadDim.available || (loadDim.score ?? 0) <= 60) return false;

  const last14 = history.slice(0, 14);
  const minVal = Math.min(...last14);
  const maxVal = Math.max(...last14);
  return maxVal - minVal < 3;
}

function detectOverreachingWithoutAdaptation(
  fatigueState: import('@/core/digital-twin/types').FatigueState | null,
  autonomic: DimensionScore,
  recoveryQ: DimensionScore,
): boolean {
  if (fatigueState === null) return false;
  const { fatigueIndex } = fatigueState;
  if (fatigueIndex === null || fatigueIndex <= 70) return false;
  return (autonomic.score ?? 100) < 40 && (recoveryQ.score ?? 100) < 40;
}

function estimateAdaptationPeak(
  status: AdaptationState['adaptationStatus'],
  trend: AdaptationState['adaptationTrend'],
): number | null {
  if (status === 'POSITIVELY_ADAPTING') {
    return trend === 'IMPROVING' ? 7 : 14;
  }
  return null;
}

function buildDecision(
  status: AdaptationState['adaptationStatus'],
  trainingCapacity: import('@/core/digital-twin/types').TrainingCapacity | null,
  plateauRisk: boolean,
  overreaching: boolean,
  dims: ScoredAdaptationDimensions,
): AdaptationDecision {
  if (status === 'INSUFFICIENT_DATA') {
    return {
      verdict: 'INSUFFICIENT_DATA',
      loadMultiplier: 1.0,
      rationale: ['Insufficient data to prescribe load changes — connect a training device.'],
    };
  }

  if (overreaching) {
    return {
      verdict: 'REDUCE_LOAD',
      loadMultiplier: 0.8,
      rationale: [
        'Overreaching without adaptation detected: fatigue accumulation is not producing adaptive response.',
        'Autonomic stress markers are suppressed despite high load.',
        'Immediate load reduction and recovery prioritisation required.',
      ],
    };
  }

  let verdict: AdaptationVerdict;
  let loadMultiplier: number;
  const rationale: string[] = [];

  if (status === 'POSITIVELY_ADAPTING') {
    if (trainingCapacity === 'FULL') {
      verdict = 'SUSTAIN';
      loadMultiplier = 1.0;
      rationale.push('Supercompensation is occurring — current progression is working.');
    } else {
      verdict = 'RECOVERY_PRIORITY';
      loadMultiplier = 0.7;
      rationale.push(
        'Positive adaptation detected but training capacity is restricted — recover first.',
      );
    }
  } else if (status === 'MAINTAINING') {
    if (plateauRisk) {
      verdict = 'INCREASE_LOAD';
      loadMultiplier = 1.07;
      rationale.push(
        'Fitness is maintained but plateau risk is high — add a progressive stimulus.',
      );
    } else {
      verdict = 'SUSTAIN';
      loadMultiplier = 1.0;
      rationale.push('Fitness is stable — current load is appropriate.');
    }
  } else if (status === 'PLATEAUING') {
    verdict = 'INCREASE_LOAD';
    loadMultiplier = 1.08;
    rationale.push('Adaptation has stalled — insufficient progressive overload stimulus.');
    if (dims.loadProgression.available) {
      rationale.push('Load progression score is below threshold for inducing new adaptation.');
    }
  } else if (status === 'MALADAPTING') {
    verdict = 'REDUCE_LOAD';
    loadMultiplier = 0.85;
    rationale.push(
      'Maladaptation indicators present — body is not responding positively to current load.',
    );
  } else {
    verdict = 'INCREASE_LOAD';
    loadMultiplier = 1.08;
    rationale.push('Detraining detected — chronically insufficient load for fitness maintenance.');
  }

  return { verdict, loadMultiplier, rationale: rationale.slice(0, 3) };
}

function buildRecommendation(
  decision: AdaptationDecision,
  signals: AdaptationSignals,
  limitingFactor: AdaptationState['limitingFactor'],
): AdaptationRecommendation {
  const TITLES: Record<AdaptationVerdict, string> = {
    INCREASE_LOAD: 'Increase load — adaptation stimulus needed',
    SUSTAIN: 'Sustain — current progression is working',
    CONSOLIDATE: 'Consolidate before progressing',
    REDUCE_LOAD: 'Reduce load — maladaptation risk detected',
    RECOVERY_PRIORITY: 'Prioritise recovery to unlock adaptation',
    INSUFFICIENT_DATA: 'Connect a device for adaptation assessment',
  };

  const SUMMARIES: Record<AdaptationVerdict, string> = {
    INCREASE_LOAD:
      'Your training data suggests a plateau or detraining pattern. Adding a progressive overload stimulus — volume, intensity, or complexity — will trigger new adaptation.',
    SUSTAIN:
      'Your training is producing positive physiological adaptations. Sustain the current progression rate to continue the supercompensation cycle.',
    CONSOLIDATE:
      'Adaptation is in progress but is not yet fully expressed. Hold current load for 7–10 days before the next progression step.',
    REDUCE_LOAD:
      'Your physiological markers suggest the training load is exceeding your adaptive capacity. Reducing volume and/or intensity will allow the necessary remodelling to complete.',
    RECOVERY_PRIORITY:
      'Positive adaptation signals are present but training capacity is constrained by acute fatigue or poor recovery. Prioritise sleep and low-intensity sessions.',
    INSUFFICIENT_DATA:
      'Collect 14 or more days of training data with a connected device to enable personalised adaptation assessment.',
  };

  const keyEvidence: string[] = [];
  if (signals.adaptationIndex !== null) {
    keyEvidence.push(`Adaptation index: ${signals.adaptationIndex}/100`);
  }
  if (signals.overreachingWithoutAdaptationDetected) {
    keyEvidence.push('Overreaching without adaptation pattern detected');
  } else if (signals.plateauRisk) {
    keyEvidence.push('Plateau risk: ≥14 days without adaptation improvement');
  }
  if (signals.historyLength > 0) {
    keyEvidence.push(
      `Trend: ${signals.adaptationTrend.toLowerCase()} over ${signals.historyLength} days`,
    );
  }

  const limitingLabels: Record<string, string> = {
    loadProgression: 'Insufficient load progression',
    neuromuscularEfficiency: 'Declining neuromuscular efficiency',
    autonomicAdaptation: 'Autonomic adaptation deficit',
    recoveryQuality: 'Insufficient recovery quality',
  };

  return {
    type: decision.verdict,
    title: TITLES[decision.verdict],
    summary: SUMMARIES[decision.verdict],
    keyEvidence: keyEvidence.slice(0, 3),
    limitingFactor:
      limitingFactor !== null && signals.adaptationStatus !== 'POSITIVELY_ADAPTING'
        ? (limitingLabels[limitingFactor] ?? limitingFactor)
        : null,
  };
}
