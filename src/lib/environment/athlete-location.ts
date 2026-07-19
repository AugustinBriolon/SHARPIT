/**
 * Resolve athlete geographic location for environmental fetch.
 *
 * Priority:
 * 1. GPS stream midpoint of today's most recent activity (map track)
 * 2. Observed map/card coords on that activity
 * 3. Travel → home fallback (`resolveDefaultActivityLocation`)
 */

import type { GeoLocation } from '@/core/environment';
import type { PrismaClient } from '@prisma/client';
import { approximateTrainingDayUtcRange } from '@/lib/training-day';
import { midpointFromLatLng } from '@/lib/geo/midpoint';

import { resolveDefaultActivityLocation } from '@/lib/geocoding/default-activity-location';

export async function resolveAthleteGeoLocation(
  prisma: PrismaClient,
  athleteId: string,
  trainingDayId: string,
): Promise<GeoLocation> {
  void athleteId;
  const { gte: start, lte: end } = approximateTrainingDayUtcRange(trainingDayId);

  const recentActivity = await prisma.activity.findFirst({
    where: { date: { gte: start, lte: end } },
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

  const streamData = recentActivity?.stream?.data as { latlng?: unknown } | null | undefined;
  const fromStream = streamData?.latlng ? midpointFromLatLng(streamData.latlng) : null;
  if (fromStream) return fromStream;

  if (recentActivity?.observedLocationLat != null && recentActivity.observedLocationLng != null) {
    return {
      latitude: recentActivity.observedLocationLat,
      longitude: recentActivity.observedLocationLng,
      label: recentActivity.observedLocationLabel ?? undefined,
    };
  }

  return resolveDefaultActivityLocation(prisma, start);
}
