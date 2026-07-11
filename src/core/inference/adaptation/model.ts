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
import { applyEnvironmentalImpactToAdaptationIndex } from '@/core/inference/environment/apply-impact';
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
import type { I18nItem } from '@/core/inference/shared/types';

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

  const adaptationIndex = applyEnvironmentalImpactToAdaptationIndex(
    rawIndex,
    context.environmentalImpact ?? null,
  );

  const historyLength = context.recentAdaptationHistory.length;

  // History maturity bonus: +15% at 28 records; see ADAPTATION_MODEL.md §7
  const historyBonus = Math.min(historyLength / 28, 1.0) * 0.15;
  let confidence = Math.min(baseConfidence + historyBonus, 1.0);
  if (historyLength < 7) confidence = Math.min(confidence, 0.5);
  if (dataCompleteness === 'INSUFFICIENT') confidence = 0.1;

  // ── Step 3: Classify ──────────────────────────────────────────────────────
  const adaptationStatus =
    adaptationIndex === null ? 'INSUFFICIENT_DATA' : classifyAdaptationStatus(adaptationIndex);

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
    adaptationIndex,
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
  const recommendation = buildRecommendation(decision, signals);

  // ── Step 10: Build AdaptationState ────────────────────────────────────────
  const adaptationState: AdaptationState = {
    adaptationIndex,
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

  return { signals, adaptationState, decision, recommendation };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function dimensionStatus(d: DimensionScore): string {
  if (!d.available) return 'unavailable';
  if (d.score !== null) return `score=${d.score}`;
  return 'computed';
}

function toDimensionResult(d: DimensionScore): DimensionResult {
  return {
    score: d.score,
    available: d.available,
    status: dimensionStatus(d),
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
      rationale: [{ code: 'adaptation.rationale.noData' }],
    };
  }

  if (overreaching) {
    return {
      verdict: 'REDUCE_LOAD',
      loadMultiplier: 0.8,
      rationale: [
        { code: 'adaptation.rationale.overreachingDetected' },
        { code: 'adaptation.rationale.autonomicSuppressed' },
        { code: 'adaptation.rationale.immediateReduction' },
      ],
    };
  }

  let verdict: AdaptationVerdict;
  let loadMultiplier: number;
  const rationale: I18nItem[] = [];

  if (status === 'POSITIVELY_ADAPTING') {
    if (trainingCapacity === 'FULL') {
      verdict = 'SUSTAIN';
      loadMultiplier = 1.0;
      rationale.push({ code: 'adaptation.rationale.supercompensation' });
    } else {
      verdict = 'RECOVERY_PRIORITY';
      loadMultiplier = 0.7;
      rationale.push({ code: 'adaptation.rationale.restrictedCapacity' });
    }
  } else if (status === 'MAINTAINING') {
    if (plateauRisk) {
      verdict = 'INCREASE_LOAD';
      loadMultiplier = 1.07;
      rationale.push({ code: 'adaptation.rationale.plateauRisk' });
    } else {
      verdict = 'SUSTAIN';
      loadMultiplier = 1.0;
      rationale.push({ code: 'adaptation.rationale.stableLoad' });
    }
  } else if (status === 'PLATEAUING') {
    verdict = 'INCREASE_LOAD';
    loadMultiplier = 1.08;
    rationale.push({ code: 'adaptation.rationale.stalled' });
    if (dims.loadProgression.available) {
      rationale.push({ code: 'adaptation.rationale.loadProgressionLow' });
    }
  } else if (status === 'MALADAPTING') {
    verdict = 'REDUCE_LOAD';
    loadMultiplier = 0.85;
    rationale.push({ code: 'adaptation.rationale.maladaptation' });
  } else {
    verdict = 'INCREASE_LOAD';
    loadMultiplier = 1.08;
    rationale.push({ code: 'adaptation.rationale.detraining' });
  }

  return { verdict, loadMultiplier, rationale: rationale.slice(0, 3) };
}

function buildRecommendation(
  decision: AdaptationDecision,
  signals: AdaptationSignals,
): AdaptationRecommendation {
  const keyEvidence: I18nItem[] = [];
  if (signals.adaptationIndex !== null) {
    keyEvidence.push({
      code: 'adaptation.evidence.index',
      params: { index: signals.adaptationIndex },
    });
  }
  if (signals.overreachingWithoutAdaptationDetected) {
    keyEvidence.push({ code: 'adaptation.evidence.overreachingPattern' });
  } else if (signals.plateauRisk) {
    keyEvidence.push({ code: 'adaptation.evidence.plateauRisk' });
  }
  if (signals.historyLength > 0) {
    keyEvidence.push({
      code: 'adaptation.evidence.trend',
      params: { trend: signals.adaptationTrend, days: signals.historyLength },
    });
  }

  return {
    type: decision.verdict,
    keyEvidence: keyEvidence.slice(0, 3),
  };
}
