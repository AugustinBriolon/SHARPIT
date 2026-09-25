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

function readLatLngArray(latlng: unknown): LatLng[] {
  if (!Array.isArray(latlng)) {
    return [];
  }
  return latlng.filter(isLatLngPair);
}

function readLatLngFromStreamData(data: unknown): LatLng[] {
  if (!data || typeof data !== 'object') {
    return [];
  }
  const { latlng } = data as { latlng?: unknown };
  return readLatLngArray(latlng);
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

export function extractRoutePreviewPathFromLatLng(
  latlng: unknown,
  maxPoints = ROUTE_PREVIEW_MAX_POINTS,
): LatLng[] | null {
  const path = readLatLngArray(latlng);
  if (path.length < 2) {
    return null;
  }
  return downsamplePath(path, maxPoints);
}

type RoutePreviewRow = {
  activityId: string;
  latlng: unknown;
};

/**
 * One DB read for the Activité hub: downsampled GPS paths for every cached stream.
 * Pulls only `data->latlng` (not full stream JSON) so Neon transfer stays small.
 */
export async function getActivityRoutePreviews(athleteId: string): Promise<ActivityRoutePreviews> {
  const rows = await prisma.$queryRaw<RoutePreviewRow[]>`
    SELECT s."activityId", s.data->'latlng' AS latlng
    FROM "ActivityStream" s
    INNER JOIN "Activity" a ON a.id = s."activityId"
    WHERE a."athleteId" = ${athleteId}
      AND s.available = true
      AND s.data IS NOT NULL
  `;

  const previews: ActivityRoutePreviews = {};
  for (const row of rows) {
    const path = extractRoutePreviewPathFromLatLng(row.latlng);
    if (path) {
      previews[row.activityId] = path;
    }
  }
  return previews;
}
