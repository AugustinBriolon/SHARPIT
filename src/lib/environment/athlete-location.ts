/**
 * Resolve athlete geographic location for environmental fetch.
 *
 * Priority:
 * 1. GPS stream midpoint of today's most recent activity (map track)
 * 2. Observed map/card coords on that activity
 * 3. Travel → home fallback (`resolveDefaultActivityLocation`)
 *
 * The returned `source` says which rung answered. Anything the athlete reads as
 * fact — a weather line, an environmental advisory — must be able to tell that
 * `default` means hard-coded coordinates rather than a place we know.
 */
export type AthleteLocationSource =
  'activity-gps' | 'activity-observed' | 'travel' | 'home' | 'default';

import type { GeoLocation } from '@/core/environment';
import type { PrismaClient } from '@prisma/client';
import { approximateTrainingDayUtcRange } from '@/lib/training/training-day';
import { midpointFromLatLng } from '@/lib/geo/midpoint';

import { resolveDefaultActivityLocation } from '@/lib/geocoding/default-activity-location';
import { isSet } from '@/lib/util/value';

type RecentActivityLocation = {
  observedLocationLat: number | null;
  observedLocationLng: number | null;
  observedLocationLabel: string | null;
  stream: { data: unknown } | null;
};

function locationFromActivityStream(
  activity: RecentActivityLocation | null | undefined,
): (GeoLocation & { source: 'activity-gps' }) | null {
  const streamData = activity?.stream?.data as { latlng?: unknown } | null | undefined;
  const fromStream = streamData?.latlng ? midpointFromLatLng(streamData.latlng) : null;
  if (!fromStream) {
    return null;
  }
  return { ...fromStream, source: 'activity-gps' };
}

function locationFromObservedCoords(
  activity: RecentActivityLocation | null | undefined,
): (GeoLocation & { source: 'activity-observed' }) | null {
  if (!activity || !isSet(activity.observedLocationLat) || !isSet(activity.observedLocationLng)) {
    return null;
  }
  return {
    latitude: activity.observedLocationLat,
    longitude: activity.observedLocationLng,
    label: activity.observedLocationLabel ?? undefined,
    source: 'activity-observed',
  };
}

export async function resolveAthleteGeoLocation(
  prisma: PrismaClient,
  athleteId: string,
  trainingDayId: string,
): Promise<GeoLocation & { source: AthleteLocationSource }> {
  const { gte: start, lte: end } = approximateTrainingDayUtcRange(trainingDayId);

  const recentActivity = await prisma.activity.findFirst({
    where: { athleteId, date: { gte: start, lte: end } },
    orderBy: { date: 'desc' },
    select: {
      observedLocationLat: true,
      observedLocationLng: true,
      observedLocationLabel: true,
      stream: {
        select: { data: true },
      },
    },
  });

  return (
    locationFromActivityStream(recentActivity) ??
    locationFromObservedCoords(recentActivity) ??
    resolveDefaultActivityLocation(prisma, athleteId, start)
  );
}
