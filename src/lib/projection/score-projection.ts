/**
 * Deterministic score projection from PMC deltas.
 *
 * Linear transforms documented in PROJECTED_ATHLETE_STATE.md — no ML.
 */

import type {
  AdaptationState,
  FatigueState,
  ReadinessCategory,
  RecoveryState,
} from '@/core/digital-twin/types';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function projectReadinessScore(current: number | null, tsbDelta: number): number | null {
  if (current == null) return null;
  return Math.round(clamp(current + tsbDelta * 0.45, 0, 100));
}

export function projectFatigueIndex(current: number | null, atlDelta: number): number | null {
  if (current == null) return null;
  return Math.round(clamp(current + atlDelta * 0.35, 0, 100));
}

export function projectAdaptationIndex(current: number | null, ctlDelta: number): number | null {
  if (current == null) return null;
  return Math.round(clamp(current + ctlDelta * 0.2, 0, 100));
}

export function readinessCategoryFromScore(score: number | null): ReadinessCategory {
  if (score == null) return 'INSUFFICIENT_DATA';
  if (score >= 85) return 'OPTIMAL';
  if (score >= 70) return 'ADEQUATE';
  if (score >= 50) return 'REDUCED';
  if (score >= 30) return 'LOW';
  return 'VERY_LOW';
}

export function fatigueLevelFromIndex(index: number | null): FatigueState['fatigueLevel'] {
  if (index == null) return 'INSUFFICIENT_DATA';
  if (index >= 80) return 'OVERREACHING_RISK';
  if (index >= 65) return 'NON_FUNCTIONAL_RISK';
  if (index >= 50) return 'ACCUMULATED';
  if (index >= 35) return 'FUNCTIONAL_HIGH';
  if (index >= 20) return 'FUNCTIONAL_LOW';
  return 'FRESH';
}

export function adaptationStatusFromIndex(
  index: number | null,
  current: AdaptationState['adaptationStatus'],
): AdaptationState['adaptationStatus'] {
  if (index == null) return 'INSUFFICIENT_DATA';
  if (index >= 70) return 'POSITIVELY_ADAPTING';
  if (index >= 50) return 'MAINTAINING';
  if (index >= 35) return 'PLATEAUING';
  if (index >= 20) return 'MALADAPTING';
  return current === 'DETRAINING' ? 'DETRAINING' : 'MALADAPTING';
}

export function synthesizeProjectedRecovery(
  base: RecoveryState,
  projectedScore: number | null,
  trainingDayId: string,
): RecoveryState {
  return {
    ...base,
    readinessScore: projectedScore,
    readinessCategory: readinessCategoryFromScore(projectedScore),
    computedAt: new Date(),
    trainingDayId,
    confidence: Math.round(base.confidence * 0.85 * 100) / 100,
    dataCompleteness: 'PARTIAL',
  };
}

export function synthesizeProjectedFatigue(
  base: FatigueState,
  projectedIndex: number | null,
  trainingDayId: string,
  tsb: number,
): FatigueState {
  const trajectory = tsb < -20 ? 'ACCUMULATING' : tsb > 5 ? 'RESOLVING' : base.trajectory;
  return {
    ...base,
    fatigueIndex: projectedIndex,
    fatigueLevel: fatigueLevelFromIndex(projectedIndex),
    trajectory,
    computedAt: new Date(),
    trainingDayId,
    confidence: Math.round(base.confidence * 0.85 * 100) / 100,
    dataCompleteness: 'PARTIAL',
  };
}

export function synthesizeProjectedAdaptation(
  base: AdaptationState,
  projectedIndex: number | null,
  trainingDayId: string,
): AdaptationState {
  return {
    ...base,
    adaptationIndex: projectedIndex,
    adaptationStatus: adaptationStatusFromIndex(projectedIndex, base.adaptationStatus),
    computedAt: new Date(),
    trainingDayId,
    confidence: Math.round(base.confidence * 0.85 * 100) / 100,
    dataCompleteness: 'PARTIAL',
  };
}

export function projectionConfidenceForDay(baseConfidence: number, dayOffset: number): number {
  return Math.round(baseConfidence * 0.95 ** dayOffset * 100) / 100;
}
