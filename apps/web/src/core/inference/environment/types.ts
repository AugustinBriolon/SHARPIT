/**
 * Environmental inference layer types (Phase 2).
 *
 * These types live outside the frozen environment-v1.1 public contract.
 */

import type {
  EnvironmentalDataCompleteness,
  EnvironmentalImpact,
  EnvironmentalStress,
} from '@/core/environment';

export type EnvironmentalStateMeta = {
  readonly trainingDayId: string;
  readonly observationRecordIds: readonly string[];
  readonly confidence: number;
  readonly dataCompleteness: EnvironmentalDataCompleteness;
  readonly computedAt: Date;
  readonly modelId: 'environment-v1.1';
};

/**
 * Inferred environmental state cached on the Digital Twin.
 * Rebuildable from EnvironmentalObservationRecord rows.
 */
export type EnvironmentalTwinState = {
  readonly stress: EnvironmentalStress;
  readonly impact: EnvironmentalImpact;
  readonly meta: EnvironmentalStateMeta;
};

export type EnvironmentalModelOutput = {
  readonly stress: EnvironmentalStress;
  readonly impact: EnvironmentalImpact;
  readonly meta: EnvironmentalStateMeta;
};

export type ThermalStressLevel =
  'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'UNKNOWN' | 'NOT_APPLICABLE';

export type TrainingEnvironmentalImpact = 'NONE' | 'MODERATE' | 'SIGNIFICANT';

/**
 * Decision-relevant environmental summary for Athlete Snapshot.
 * No weather fields, provider metadata, or internal stressor details.
 */
export type EnvironmentalDecisionSnapshot = {
  readonly thermalStressLevel: ThermalStressLevel;
  readonly recoveryDemandAdjustment: number | null;
  readonly fatigueAdjustment: number | null;
  readonly performanceAdjustment: number | null;
  readonly trainingImpact: TrainingEnvironmentalImpact;
  readonly confidence: number;
  readonly computedAt: string;
};
