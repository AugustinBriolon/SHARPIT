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
} from '@/core/planned-session/types';
import { needsExposureConfirmation } from '@/core/planned-session/defaults';
import type { ActivityType } from '@prisma/client';

export type BuildPlannedSessionAdvisoriesInput = {
  readonly sessionType: ActivityType;
  readonly exposure: PlannedSessionExposureSetting;
  readonly intensity: SessionIntensity | null;
  readonly environment: PlannedSessionEnvironmentalProjection | null;
  readonly scheduledHourLocal: number | null;
};

export function buildPlannedSessionAdvisories(
  input: BuildPlannedSessionAdvisoriesInput,
): PlannedSessionAdvisory[] {
  const advisories: PlannedSessionAdvisory[] = [];

  if (needsExposureConfirmation(input.sessionType, input.exposure)) {
    advisories.push({
      kind: 'CONFIRM_LOCATION',
      priority: 0,
      headlineCode: 'planned.advisory.confirmLocation.headline',
      rationaleCode: 'planned.advisory.confirmLocation.rationale',
      confidence: 1,
    });
    return advisories;
  }

  if (input.exposure === 'INDOOR') {
    advisories.push({
      kind: 'PROCEED',
      priority: 10,
      headlineCode: 'planned.advisory.indoorProceed.headline',
      rationaleCode: 'planned.advisory.indoorProceed.rationale',
      confidence: 0.9,
    });
    return advisories;
  }

  const env = input.environment;
  if (!env || env.freshness === 'UNAVAILABLE') {
    advisories.push({
      kind: 'NO_FORECAST',
      priority: 5,
      headlineCode: 'planned.advisory.noForecast.headline',
      rationaleCode: 'planned.advisory.noForecast.rationale',
      confidence: 0.5,
    });
    return advisories;
  }

  const isHard =
    input.intensity === 'THRESHOLD' || input.intensity === 'VO2MAX' || input.intensity === 'RACE';

  if (env.thermalStressLevel === 'EXTREME' || env.thermalStressLevel === 'HIGH') {
    if (isHard) {
      advisories.push({
        kind: 'REDUCE_INTENSITY',
        priority: 1,
        headlineCode: 'planned.advisory.reduceIntensity.headline',
        rationaleCode: 'planned.advisory.reduceIntensity.rationale',
        confidence: env.confidence,
      });
    }
    if (input.scheduledHourLocal != null && input.scheduledHourLocal >= 11) {
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

  if (
    env.recoveryDemandAdjustment != null &&
    env.recoveryDemandAdjustment >= 0.1 &&
    env.trainingImpact !== 'NONE'
  ) {
    advisories.push({
      kind: 'RECOVERY_DEMAND',
      priority: 5,
      headlineCode: 'planned.advisory.recoveryDemand.headline',
      rationaleCode: 'planned.advisory.recoveryDemand.rationale',
      confidence: env.confidence,
    });
  }

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

export function buildPlannedSessionPreparation(
  advisories: readonly PlannedSessionAdvisory[],
  environment: PlannedSessionEnvironmentalProjection | null,
): PlannedSessionPreparationItem[] {
  const items: PlannedSessionPreparationItem[] = [];
  const kinds = new Set(advisories.map((a) => a.kind));

  if (kinds.has('HYDRATION')) {
    items.push({ code: 'planned.prep.hydration' });
  }
  if (kinds.has('REDUCE_INTENSITY') || kinds.has('SHIFT_EARLIER')) {
    items.push({ code: 'planned.prep.heatManagement' });
  }
  if (environment?.trainingImpact === 'SIGNIFICANT') {
    items.push({
      code: 'planned.prep.recoveryBuffer',
      params: {
        recoveryPct: Math.round((environment.recoveryDemandAdjustment ?? 0) * 100),
      },
    });
  }
  if (kinds.has('CONFIRM_LOCATION')) {
    items.push({ code: 'planned.prep.confirmExposure' });
  }

  return items;
}
