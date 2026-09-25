import { sportSupportsOutdoorContext } from '@/core/planned-session/defaults';
import type { ClientPlannedSession } from '@/lib/query/types';

export type ActiveTravelLocation = {
  locationLabel: string;
  locationLat: number;
  locationLng: number;
  startDate: Date | string;
  endDate: Date | string;
};

function toUtcDay(value: Date | string): number {
  const date = value instanceof Date ? value : new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function sessionDayUtc(session: ClientPlannedSession): number {
  return toUtcDay(session.date);
}

function isOutdoorExposure(session: ClientPlannedSession): boolean {
  const exposure = session.exposureSetting as 'INDOOR' | 'OUTDOOR' | 'UNKNOWN' | null | undefined;
  return exposure !== 'INDOOR';
}

function locationMatchesTravel(
  session: ClientPlannedSession,
  travel: ActiveTravelLocation,
): boolean {
  return (
    session.locationLabel === travel.locationLabel &&
    session.locationLat === travel.locationLat &&
    session.locationLng === travel.locationLng
  );
}

/** Whether an upcoming outdoor session should inherit the active travel place. */
export function shouldApplyTravelLocationToSession(
  session: ClientPlannedSession,
  travel: ActiveTravelLocation,
): boolean {
  if (session.completed || session.activityId) {
    return false;
  }
  if (!sportSupportsOutdoorContext(session.type)) {
    return false;
  }
  if (!isOutdoorExposure(session)) {
    return false;
  }

  const day = sessionDayUtc(session);
  const start = toUtcDay(travel.startDate);
  const end = toUtcDay(travel.endDate);
  if (day < start || day > end) {
    return false;
  }

  return !locationMatchesTravel(session, travel);
}

export function travelLocationPatch(travel: ActiveTravelLocation) {
  return {
    exposureSetting: 'OUTDOOR' as const,
    locationLabel: travel.locationLabel,
    locationLat: travel.locationLat,
    locationLng: travel.locationLng,
  };
}
