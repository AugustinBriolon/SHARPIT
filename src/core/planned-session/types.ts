/**
 * Planned Session — contextual training intention (product domain).
 *
 * References Environment Engine outputs only — no duplicated inference logic.
 * @see docs/product/INTELLIGENT_PLANNED_SESSIONS.md
 */

import type { ActivityType, SessionIntensity } from '@prisma/client';
import type { GeoLocation } from '@/core/environment';
import type { EnvironmentalApplicability } from '@/core/environment';
import type {
  ThermalStressLevel,
  TrainingEnvironmentalImpact,
} from '@/core/inference/environment/types';
import type { EnvironmentalDataCompleteness } from '@/core/environment';

export type PlannedSessionExposureSetting = 'INDOOR' | 'OUTDOOR' | 'UNKNOWN';

export type PlannedSessionLocationType =
  'TRACK' | 'ROAD' | 'TRAIL' | 'POOL' | 'GYM' | 'TRAINER' | 'UNKNOWN';

export type PlannedSessionIntention = {
  readonly sessionId: string;
  readonly type: ActivityType;
  readonly scheduledStart: string;
  readonly scheduledEnd: string;
  readonly durationMin: number | null;
  readonly intensity: SessionIntensity | null;
  readonly exposure: PlannedSessionExposureSetting;
  readonly location: GeoLocation | null;
  readonly locationType: PlannedSessionLocationType | null;
  readonly title: string | null;
};

/** Projection of Environment Engine outputs — not raw weather. */
export type PlannedSessionEnvironmentalProjection = {
  readonly applicability: EnvironmentalApplicability;
  readonly thermalStressLevel: ThermalStressLevel;
  readonly trainingImpact: TrainingEnvironmentalImpact;
  readonly recoveryDemandAdjustment: number | null;
  readonly performanceAdjustment: number | null;
  readonly confidence: number;
  readonly dataCompleteness: EnvironmentalDataCompleteness;
  readonly freshness: 'FRESH' | 'STALE' | 'UNAVAILABLE';
  readonly providerId: string | null;
  readonly computedAt: string;
};

export type PlannedSessionAdvisoryKind =
  | 'CONFIRM_LOCATION'
  | 'SHIFT_EARLIER'
  | 'REDUCE_INTENSITY'
  | 'INDOOR_ALTERNATIVE'
  | 'HYDRATION'
  | 'RAIN_RISK'
  | 'COLD_RISK'
  | 'RECOVERY_DEMAND'
  | 'PROCEED'
  | 'NO_FORECAST';

export type PlannedSessionAdvisory = {
  readonly kind: PlannedSessionAdvisoryKind;
  readonly priority: number;
  readonly headlineCode: string;
  readonly rationaleCode: string;
  readonly confidence: number;
};

export type PlannedSessionPreparationItem = {
  readonly code: string;
  readonly params?: Readonly<Record<string, string | number>>;
};

export type PlannedSessionWeatherSignals = {
  readonly maxPrecipitationMm: number | null;
  readonly minTemperatureC: number | null;
  readonly maxWindMps: number | null;
};

export type PlannedSessionContext = {
  readonly intention: PlannedSessionIntention;
  readonly environment: PlannedSessionEnvironmentalProjection | null;
  readonly advisories: readonly PlannedSessionAdvisory[];
  readonly preparation: readonly PlannedSessionPreparationItem[];
};

export type PlannedSessionCompletionComparison = {
  readonly visible: boolean;
  readonly plannedImpact: TrainingEnvironmentalImpact | null;
  readonly observedImpact: TrainingEnvironmentalImpact | null;
  readonly impactDeltaLabel: string | null;
  readonly plannedThermalLabel: string | null;
  readonly observedThermalLabel: string | null;
  readonly narrativeLines: readonly string[];
};
