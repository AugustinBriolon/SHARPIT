/**
 * Planned Session advisories — product recommendations from environmental projection.
 *
 * Does not mutate DecisionState or physiological models.
 * @see docs/product/INTELLIGENT_PLANNED_SESSIONS.md
 */

import type { SessionIntensity } from '@prisma/client';
import type {
  PlannedSessionAdvisory,
  PlannedSessionEnvironmentalProjection,
  PlannedSessionExposureSetting,
  PlannedSessionPreparationItem,
  PlannedSessionWeatherSignals,
} from '@/core/planned-session/types';
import { needsExposureConfirmation } from '@/core/planned-session/defaults';
import type { ActivityType } from '@prisma/client';

export type BuildPlannedSessionAdvisoriesInput = {
  readonly sessionType: ActivityType;
  readonly exposure: PlannedSessionExposureSetting;
  readonly intensity: SessionIntensity | null;
  readonly environment: PlannedSessionEnvironmentalProjection | null;
  readonly scheduledHourLocal: number | null;
  readonly weatherSignals?: PlannedSessionWeatherSignals | null;
};

function isHardIntensity(intensity: SessionIntensity | null): boolean {
  return intensity === 'THRESHOLD' || intensity === 'VO2MAX' || intensity === 'RACE';
}

function confirmLocationAdvisory(): PlannedSessionAdvisory {
  return {
    kind: 'CONFIRM_LOCATION',
    priority: 0,
    headlineCode: 'planned.advisory.confirmLocation.headline',
    rationaleCode: 'planned.advisory.confirmLocation.rationale',
    confidence: 1,
  };
}

function indoorProceedAdvisory(): PlannedSessionAdvisory {
  return {
    kind: 'PROCEED',
    priority: 10,
    headlineCode: 'planned.advisory.indoorProceed.headline',
    rationaleCode: 'planned.advisory.indoorProceed.rationale',
    confidence: 0.9,
  };
}

function appendWeatherAdvisories(
  advisories: PlannedSessionAdvisory[],
  input: BuildPlannedSessionAdvisoriesInput,
  env: PlannedSessionEnvironmentalProjection,
): void {
  const signals = input.weatherSignals;
  if (signals?.maxPrecipitationMm !== null && signals.maxPrecipitationMm >= 1.5) {
    advisories.push({
      kind: 'RAIN_RISK',
      priority: 2,
      headlineCode: 'planned.advisory.rainRisk.headline',
      rationaleCode: 'planned.advisory.rainRisk.rationale',
      confidence: env.confidence,
    });
  }
  if (signals?.minTemperatureC !== null && signals.minTemperatureC <= 2) {
    advisories.push({
      kind: 'COLD_RISK',
      priority: 2,
      headlineCode: 'planned.advisory.coldRisk.headline',
      rationaleCode: 'planned.advisory.coldRisk.rationale',
      confidence: env.confidence,
    });
  }
}

function appendThermalAdvisories(
  advisories: PlannedSessionAdvisory[],
  input: BuildPlannedSessionAdvisoriesInput,
  env: PlannedSessionEnvironmentalProjection,
): void {
  if (env.thermalStressLevel !== 'EXTREME' && env.thermalStressLevel !== 'HIGH') {
    return;
  }

  if (isHardIntensity(input.intensity)) {
    advisories.push({
      kind: 'REDUCE_INTENSITY',
      priority: 1,
      headlineCode: 'planned.advisory.reduceIntensity.headline',
      rationaleCode: 'planned.advisory.reduceIntensity.rationale',
      confidence: env.confidence,
    });
  }
  if (input.scheduledHourLocal !== null && input.scheduledHourLocal >= 11) {
    advisories.push({
      kind: 'SHIFT_EARLIER',
      priority: 2,
      headlineCode: 'planned.advisory.shiftEarlier.headline',
      rationaleCode: 'planned.advisory.shiftEarlier.rationale',
      confidence: env.confidence,
    });
  }
  advisories.push({
    kind: 'HYDRATION',
    priority: 3,
    headlineCode: 'planned.advisory.hydration.headline',
    rationaleCode: 'planned.advisory.hydration.rationale',
    confidence: env.confidence,
  });
  if (env.trainingImpact === 'SIGNIFICANT') {
    advisories.push({
      kind: 'INDOOR_ALTERNATIVE',
      priority: 4,
      headlineCode: 'planned.advisory.indoorAlternative.headline',
      rationaleCode: 'planned.advisory.indoorAlternative.rationale',
      confidence: env.confidence,
    });
  }
}

function appendRecoveryDemandAdvisory(
  advisories: PlannedSessionAdvisory[],
  env: PlannedSessionEnvironmentalProjection,
): void {
  if (
    env.recoveryDemandAdjustment === null ||
    env.recoveryDemandAdjustment < 0.1 ||
    env.trainingImpact === 'NONE'
  ) {
    return;
  }

  advisories.push({
    kind: 'RECOVERY_DEMAND',
    priority: 5,
    headlineCode: 'planned.advisory.recoveryDemand.headline',
    rationaleCode: 'planned.advisory.recoveryDemand.rationale',
    confidence: env.confidence,
  });
}

export function buildPlannedSessionAdvisories(
  input: BuildPlannedSessionAdvisoriesInput,
): PlannedSessionAdvisory[] {
  if (needsExposureConfirmation(input.sessionType, input.exposure)) {
    return [confirmLocationAdvisory()];
  }
  if (input.exposure === 'INDOOR') {
    return [indoorProceedAdvisory()];
  }

  const env = input.environment;
  if (!env || env.freshness === 'UNAVAILABLE') {
    return [
      {
        kind: 'NO_FORECAST',
        priority: 5,
        headlineCode: 'planned.advisory.noForecast.headline',
        rationaleCode: 'planned.advisory.noForecast.rationale',
        confidence: 0.5,
      },
    ];
  }

  const advisories: PlannedSessionAdvisory[] = [];
  appendWeatherAdvisories(advisories, input, env);
  appendThermalAdvisories(advisories, input, env);
  appendRecoveryDemandAdvisory(advisories, env);

  if (advisories.length === 0) {
    advisories.push({
      kind: 'PROCEED',
      priority: 10,
      headlineCode: 'planned.advisory.proceed.headline',
      rationaleCode: 'planned.advisory.proceed.rationale',
      confidence: env.confidence,
    });
  }

  return advisories.sort((a, b) => a.priority - b.priority);
}

const PREP_BY_ADVISORY_KIND: Array<{
  kinds: PlannedSessionAdvisory['kind'][];
  item: PlannedSessionPreparationItem;
}> = [
  { kinds: ['HYDRATION', 'RAIN_RISK'], item: { code: 'planned.prep.hydration' } },
  { kinds: ['REDUCE_INTENSITY', 'SHIFT_EARLIER'], item: { code: 'planned.prep.heatManagement' } },
  { kinds: ['CONFIRM_LOCATION'], item: { code: 'planned.prep.confirmExposure' } },
];

export function buildPlannedSessionPreparation(
  advisories: readonly PlannedSessionAdvisory[],
  environment: PlannedSessionEnvironmentalProjection | null,
): PlannedSessionPreparationItem[] {
  const kinds = new Set(advisories.map((a) => a.kind));
  const items = PREP_BY_ADVISORY_KIND.flatMap(({ kinds: advisoryKinds, item }) =>
    advisoryKinds.some((kind) => kinds.has(kind)) ? [item] : [],
  );

  if (environment?.trainingImpact === 'SIGNIFICANT') {
    items.push({
      code: 'planned.prep.recoveryBuffer',
      params: {
        recoveryPct: Math.round((environment.recoveryDemandAdjustment ?? 0) * 100),
      },
    });
  }

  return items;
}
