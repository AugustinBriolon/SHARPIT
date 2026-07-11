/**
 * Apply EnvironmentalImpact modifiers to physiological model outputs.
 *
 * Models import EnvironmentalImpact only — never EnvironmentalStress or observations.
 */

import type { EnvironmentalImpact } from '@/core/environment';
import { ENVIRONMENTAL_SIGNIFICANCE_THRESHOLDS } from '@/core/environment/calibration';

function readMultiplier(
  metric: EnvironmentalImpact['recovery']['demandMultiplier'],
): number | null {
  return metric.available ? metric.value : null;
}

export function applyEnvironmentalImpactToReadiness(
  readinessScore: number | null,
  impact: EnvironmentalImpact | null,
): number | null {
  if (readinessScore === null || impact == null) return readinessScore;
  const demand = readMultiplier(impact.recovery.demandMultiplier);
  if (demand == null || demand <= 1) return readinessScore;
  return Math.max(0, Math.round(readinessScore / demand));
}

export function applyEnvironmentalImpactToFatigueIndex(
  fatigueIndex: number | null,
  impact: EnvironmentalImpact | null,
): number | null {
  if (fatigueIndex === null || impact == null) return fatigueIndex;
  const accumulation = readMultiplier(impact.fatigue.accumulationMultiplier);
  if (accumulation == null || accumulation <= 1) return fatigueIndex;
  return Math.min(100, Math.round(fatigueIndex * accumulation));
}

export function applyEnvironmentalImpactToAdaptationIndex(
  adaptationIndex: number | null,
  impact: EnvironmentalImpact | null,
): number | null {
  if (adaptationIndex === null || impact == null) return adaptationIndex;
  const ratio = readMultiplier(impact.performance.expectedOutputRatio);
  if (ratio == null || ratio >= 1) return adaptationIndex;
  return Math.max(0, Math.round(adaptationIndex * ratio));
}

export function environmentalImpactIsSignificant(impact: EnvironmentalImpact | null): boolean {
  if (!impact || impact.confidence <= 0) return false;
  const recovery = readMultiplier(impact.recovery.demandMultiplier);
  const fatigue = readMultiplier(impact.fatigue.accumulationMultiplier);
  const performance = readMultiplier(impact.performance.expectedOutputRatio);
  const hydration = readMultiplier(impact.hydration.demandMultiplier);
  const thresholds = ENVIRONMENTAL_SIGNIFICANCE_THRESHOLDS;

  return (
    (recovery != null && recovery >= thresholds.recoveryDemand) ||
    (fatigue != null && fatigue >= thresholds.fatigueAccumulation) ||
    (performance != null && performance <= thresholds.performanceRatio) ||
    (hydration != null && hydration >= thresholds.hydrationDemand)
  );
}
