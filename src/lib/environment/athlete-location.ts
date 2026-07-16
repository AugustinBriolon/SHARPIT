/**
 * Resolve athlete geographic location for environmental fetch.
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
  const { gte: start, lte: end } = approximateTrainingDayUtcRange(trainingDayId);

  const recentActivity = await prisma.activity.findFirst({
    where: { date: { gte: start, lte: end } },
    orderBy: { date: 'desc' },
    select: {
      stream: {
        select: { data: true },
      },
    },
  });

  const streamData = recentActivity?.stream?.data as { latlng?: unknown } | null | undefined;
  const fromStream = streamData?.latlng ? midpointFromLatLng(streamData.latlng) : null;
  if (fromStream) return fromStream;

  return resolveDefaultActivityLocation(prisma, start);
}
