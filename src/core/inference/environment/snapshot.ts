/**
 * Map inferred environmental state to Athlete Snapshot decision fields.
 */

import { getEnvironmentalStressor } from '@/core/environment';
import type { EnvironmentalImpact, EnvironmentalStress } from '@/core/environment';
import type {
  EnvironmentalDecisionSnapshot,
  EnvironmentalTwinState,
  ThermalStressLevel,
  TrainingEnvironmentalImpact,
} from './types';

function thermalLevelFromStress(stress: EnvironmentalStress): ThermalStressLevel {
  if (stress.suppressionReason != null) return 'NOT_APPLICABLE';
  const thermal = getEnvironmentalStressor(stress, 'THERMAL');
  if (!thermal?.intensity.available) return 'UNKNOWN';
  const { value } = thermal.intensity;
  if (value < 0.35) return 'LOW';
  if (value < 0.55) return 'MODERATE';
  if (value < 0.8) return 'HIGH';
  return 'EXTREME';
}

function adjustmentDelta(
  multiplier: { available: boolean; value?: number } | undefined,
): number | null {
  if (!multiplier?.available) return null;
  return Math.round((multiplier.value! - 1) * 100) / 100;
}

function trainingImpactFromAdjustments(
  recoveryDelta: number | null,
  fatigueDelta: number | null,
  performanceDelta: number | null,
): TrainingEnvironmentalImpact {
  const magnitudes = [
    recoveryDelta != null ? Math.abs(recoveryDelta) : 0,
    fatigueDelta != null ? Math.abs(fatigueDelta) : 0,
    performanceDelta != null ? Math.abs(performanceDelta) : 0,
  ];
  const max = Math.max(...magnitudes);
  if (max >= 0.15) return 'SIGNIFICANT';
  if (max >= 0.05) return 'MODERATE';
  return 'NONE';
}

export function buildEnvironmentalDecisionSnapshot(
  state: EnvironmentalTwinState,
): EnvironmentalDecisionSnapshot {
  const { stress, impact, meta } = state;
  const recoveryDemandAdjustment = adjustmentDelta(impact.recovery.demandMultiplier);
  const fatigueAdjustment = adjustmentDelta(impact.fatigue.accumulationMultiplier);
  const performanceAdjustment = impact.performance.expectedOutputRatio.available
    ? Math.round((impact.performance.expectedOutputRatio.value - 1) * 100) / 100
    : null;

  return {
    thermalStressLevel: thermalLevelFromStress(stress),
    recoveryDemandAdjustment,
    fatigueAdjustment,
    performanceAdjustment,
    trainingImpact: trainingImpactFromAdjustments(
      recoveryDemandAdjustment,
      fatigueAdjustment,
      performanceAdjustment,
    ),
    confidence: meta.confidence,
    computedAt: meta.computedAt.toISOString(),
  };
}

export function buildEnvironmentalDecisionSnapshotFromParts(input: {
  stress: EnvironmentalStress;
  impact: EnvironmentalImpact;
  confidence: number;
  computedAt: Date;
}): EnvironmentalDecisionSnapshot {
  return buildEnvironmentalDecisionSnapshot({
    stress: input.stress,
    impact: input.impact,
    meta: {
      trainingDayId: '',
      observationRecordIds: [],
      confidence: input.confidence,
      dataCompleteness: 'NONE',
      computedAt: input.computedAt,
      modelId: 'environment-v1.1',
    },
  });
}
