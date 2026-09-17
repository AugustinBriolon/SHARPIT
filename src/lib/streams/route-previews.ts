import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Compact enough for hub cards; detail page still loads full streams. */
export const ROUTE_PREVIEW_MAX_POINTS = 48;

export type ActivityRoutePreviews = Record<string, [number, number][]>;

type LatLng = [number, number];

function isLatLngPair(value: unknown): value is LatLng {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function readLatLngFromStreamData(data: unknown): LatLng[] {
  if (!data || typeof data !== 'object') {
    return [];
  }
  const { latlng } = data as { latlng?: unknown };
  if (!Array.isArray(latlng)) {
    return [];
  }
  return latlng.filter(isLatLngPair);
}

export function downsamplePath(path: LatLng[], maxPoints: number): LatLng[] {
  if (path.length <= maxPoints) {
    return path;
  }
  const step = path.length / maxPoints;
  const out: LatLng[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(path[Math.floor(i * step)]!);
  }
  const last = path[path.length - 1]!;
  if (out[out.length - 1] !== last) {
    out.push(last);
  }
  return out;
}

/**
 * Build a map-preview path from cached stream JSON — never hits Garmin/Strava.
 */
export function extractRoutePreviewPath(
  data: unknown,
  maxPoints = ROUTE_PREVIEW_MAX_POINTS,
): LatLng[] | null {
  const path = readLatLngFromStreamData(data);
  if (path.length < 2) {
    return null;
  }
  return downsamplePath(path, maxPoints);
}

/**
 * One DB read for the Activité hub: downsampled GPS paths for every cached stream.
 */
export async function getActivityRoutePreviews(athleteId: string): Promise<ActivityRoutePreviews> {
  const rows = await prisma.activityStream.findMany({
    where: {
      available: true,
      data: { not: Prisma.DbNull },
      activity: { athleteId },
    },
    select: {
      activityId: true,
      data: true,
    },
  });

  const previews: ActivityRoutePreviews = {};
  for (const row of rows) {
    const path = extractRoutePreviewPath(row.data);
    if (path) {
      previews[row.activityId] = path;
    }
  }
  return previews;
}
