import type { ActivityType } from '@prisma/client';
import type { PlannedSessionExposureSetting } from './types';

const OUTDOOR_CAPABLE = new Set<ActivityType>(['RUN', 'BIKE', 'SWIM', 'TRIATHLON']);

export function sportSupportsOutdoorContext(type: ActivityType): boolean {
  return OUTDOOR_CAPABLE.has(type);
}

export function defaultExposureForActivityType(type: ActivityType): PlannedSessionExposureSetting {
  if (type === 'STRENGTH') return 'INDOOR';
  if (sportSupportsOutdoorContext(type)) return 'UNKNOWN';
  return 'UNKNOWN';
}

export function needsExposureConfirmation(
  type: ActivityType,
  exposure: PlannedSessionExposureSetting,
): boolean {
  return sportSupportsOutdoorContext(type) && exposure === 'UNKNOWN';
}
