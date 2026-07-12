/**
 * Resolve athlete geographic location for environmental fetch.
 */

import type { GeoLocation } from '@/core/environment';
import type { PrismaClient } from '@prisma/client';
import { approximateTrainingDayUtcRange } from '@/lib/training-day';

import { resolveHomeLocation } from '@/lib/geocoding/home-location';

function midpointFromLatLng(latlng: unknown): GeoLocation | null {
  if (!Array.isArray(latlng) || latlng.length === 0) return null;
  const points = latlng.filter(
    (p): p is [number, number] =>
      Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number',
  );
  if (points.length === 0) return null;
  const mid = points[Math.floor(points.length / 2)];
  return { latitude: mid[0], longitude: mid[1] };
}

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

  const fallbackLat = Number(process.env.SHARPIT_DEFAULT_LATITUDE);
  const fallbackLng = Number(process.env.SHARPIT_DEFAULT_LONGITUDE);
  if (Number.isFinite(fallbackLat) && Number.isFinite(fallbackLng)) {
    return { latitude: fallbackLat, longitude: fallbackLng, label: 'Colombes, France' };
  }

  const home = await resolveHomeLocation(prisma);
  return home;
}
