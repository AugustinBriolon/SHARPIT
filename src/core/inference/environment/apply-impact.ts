/**
 * Apply EnvironmentalImpact modifiers to physiological model outputs.
 *
 * Models import EnvironmentalImpact only — never EnvironmentalStress or observations.
 */

import type { EnvironmentalImpact } from '@/core/environment';
import { isSet } from '@/lib/util/value';
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
  if (
    readinessScore === undefined ||
    readinessScore === null ||
    impact === undefined ||
    impact === null
  ) {
    return readinessScore;
  }
  const demand = readMultiplier(impact.recovery.demandMultiplier);
  if (demand === undefined || demand === null || demand <= 1) {
    return readinessScore;
  }
  return Math.max(0, Math.round(readinessScore / demand));
}

export function applyEnvironmentalImpactToFatigueIndex(
  fatigueIndex: number | null,
  impact: EnvironmentalImpact | null,
): number | null {
  if (
    fatigueIndex === undefined ||
    fatigueIndex === null ||
    impact === undefined ||
    impact === null
  ) {
    return fatigueIndex;
  }
  const accumulation = readMultiplier(impact.fatigue.accumulationMultiplier);
  if (accumulation === undefined || accumulation === null || accumulation <= 1) {
    return fatigueIndex;
  }
  return Math.min(100, Math.round(fatigueIndex * accumulation));
}

export function applyEnvironmentalImpactToAdaptationIndex(
  adaptationIndex: number | null,
  impact: EnvironmentalImpact | null,
): number | null {
  if (
    adaptationIndex === undefined ||
    adaptationIndex === null ||
    impact === undefined ||
    impact === null
  ) {
    return adaptationIndex;
  }
  const ratio = readMultiplier(impact.performance.expectedOutputRatio);
  if (ratio === undefined || ratio === null || ratio >= 1) {
    return adaptationIndex;
  }
  return Math.max(0, Math.round(adaptationIndex * ratio));
}

function exceedsRecoveryThreshold(recovery: number | null, threshold: number): boolean {
  return isSet(recovery) && recovery >= threshold;
}

function exceedsFatigueThreshold(fatigue: number | null, threshold: number): boolean {
  return isSet(fatigue) && fatigue >= threshold;
}

function belowPerformanceThreshold(performance: number | null, threshold: number): boolean {
  return isSet(performance) && performance <= threshold;
}

function exceedsHydrationThreshold(hydration: number | null, threshold: number): boolean {
  return isSet(hydration) && hydration >= threshold;
}

export function environmentalImpactIsSignificant(impact: EnvironmentalImpact | null): boolean {
  if (!impact || impact.confidence <= 0) {
    return false;
  }

  const thresholds = ENVIRONMENTAL_SIGNIFICANCE_THRESHOLDS;
  const recovery = readMultiplier(impact.recovery.demandMultiplier);
  const fatigue = readMultiplier(impact.fatigue.accumulationMultiplier);
  const performance = readMultiplier(impact.performance.expectedOutputRatio);
  const hydration = readMultiplier(impact.hydration.demandMultiplier);

  return (
    exceedsRecoveryThreshold(recovery, thresholds.recoveryDemand) ||
    exceedsFatigueThreshold(fatigue, thresholds.fatigueAccumulation) ||
    belowPerformanceThreshold(performance, thresholds.performanceRatio) ||
    exceedsHydrationThreshold(hydration, thresholds.hydrationDemand)
  );
}
