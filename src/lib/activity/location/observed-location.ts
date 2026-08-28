import type { Prisma, PrismaClient } from '@prisma/client';
import { reverseGeocode } from '@/lib/geocoding/nominatim';
import { resolveAthleteGeoLocation } from '@/lib/environment/athlete-location';
import { midpointFromLatLng } from '@/lib/geo/midpoint';

const COORD_EPS = 0.0005; // ~50 m — ignore tiny float noise when comparing map vs stored

function sameCoords(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < COORD_EPS && Math.abs(a.longitude - b.longitude) < COORD_EPS
  );
}

async function persistObservedLocation(
  prisma: PrismaClient,
  activityId: string,
  coords: { latitude: number; longitude: number },
  label: string,
) {
  await prisma.activity.update({
    where: { id: activityId },
    data: {
      observedLocationLabel: label,
      observedLocationLat: coords.latitude,
      observedLocationLng: coords.longitude,
    },
  });
  return { label, ...coords };
}

async function resolveFromStreamMidpoint(input: {
  prisma: PrismaClient;
  activityId: string;
  fromStream: { latitude: number; longitude: number };
  stored: { latitude: number; longitude: number } | null;
  storedLabel: string | null | undefined;
}) {
  if (
    input.stored &&
    sameCoords(input.stored, input.fromStream) &&
    input.storedLabel?.trim()
  ) {
    return { label: input.storedLabel, ...input.stored };
  }

  const place = await reverseGeocode(input.fromStream.latitude, input.fromStream.longitude);
  const label =
    place?.label ??
    `${input.fromStream.latitude.toFixed(3)}, ${input.fromStream.longitude.toFixed(3)}`;
  return persistObservedLocation(input.prisma, input.activityId, input.fromStream, label);
}

async function resolveFromStoredCoords(
  prisma: PrismaClient,
  activityId: string,
  coords: { latitude: number; longitude: number },
  storedLabel: string | null | undefined,
) {
  if (storedLabel?.trim()) {
    return { label: storedLabel, ...coords };
  }

  const place = await reverseGeocode(coords.latitude, coords.longitude);
  const label = place?.label ?? `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`;
  await prisma.activity.update({
    where: { id: activityId },
    data: { observedLocationLabel: label },
  });
  return { label, ...coords };
}

async function resolveFromAthleteFallback(
  prisma: PrismaClient,
  activityId: string,
  athleteId: string,
  trainingDayId: string,
) {
  const fallback = await resolveAthleteGeoLocation(prisma, athleteId, trainingDayId);
  const coords = { latitude: fallback.latitude, longitude: fallback.longitude };
  const place = await reverseGeocode(coords.latitude, coords.longitude);
  const label =
    fallback.label?.trim() ||
    place?.label ||
    `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`;
  return persistObservedLocation(prisma, activityId, coords, label);
}

/**
 * Resolve and persist activity observed location.
 *
 * Priority:
 * 1. GPS stream midpoint (map track) — overrides a stale travel stamp
 * 2. Existing map / card coords (`observedLocationLat/Lng`)
 * 3. Athlete fallback (travel → home)
 */
type ActivityLocationBackfillRow = {
  athleteId: string;
  observedLocationLat: number | null;
  observedLocationLng: number | null;
  observedLocationLabel: string | null;
  date: Date;
  stream: { data: Prisma.JsonValue } | null;
};

async function resolveBackfillFromActivity(
  prisma: PrismaClient,
  activity: ActivityLocationBackfillRow,
  activityId: string,
): Promise<{ label: string; latitude: number; longitude: number } | null> {
  const streamData = activity.stream?.data as { latlng?: unknown } | null | undefined;
  const fromStream = streamData?.latlng ? midpointFromLatLng(streamData.latlng) : null;

  if (fromStream) {
    const stored =
      (activity.observedLocationLat !== undefined && activity.observedLocationLat !== null) && (activity.observedLocationLng !== undefined && activity.observedLocationLng !== null)
        ? { latitude: activity.observedLocationLat, longitude: activity.observedLocationLng }
        : null;
    return resolveFromStreamMidpoint({
      prisma,
      activityId,
      fromStream,
      stored,
      storedLabel: activity.observedLocationLabel,
    });
  }

  const fromStored = resolveBackfillFromStoredCoords(prisma, activity, activityId);
  if (fromStored) {
    return fromStored;
  }

  const trainingDayId = activity.date.toISOString().slice(0, 10);
  return resolveFromAthleteFallback(prisma, activityId, activity.athleteId, trainingDayId);
}

function resolveBackfillFromStoredCoords(
  prisma: PrismaClient,
  activity: Pick<
    ActivityLocationBackfillRow,
    'observedLocationLat' | 'observedLocationLng' | 'observedLocationLabel'
  >,
  activityId: string,
): Promise<{ label: string; latitude: number; longitude: number } | null> | null {
  if ((activity.observedLocationLat === undefined || activity.observedLocationLat === null) || (activity.observedLocationLng === undefined || activity.observedLocationLng === null)) {
    return null;
  }
  return resolveFromStoredCoords(
    prisma,
    activityId,
    { latitude: activity.observedLocationLat, longitude: activity.observedLocationLng },
    activity.observedLocationLabel,
  );
}

export async function backfillActivityObservedLocation(
  prisma: PrismaClient,
  activityId: string,
): Promise<{ label: string; latitude: number; longitude: number } | null> {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      athleteId: true,
      observedLocationLat: true,
      observedLocationLng: true,
      observedLocationLabel: true,
      date: true,
      stream: { select: { data: true } },
    },
  });

  if (!activity) {
    return null;
  }

  return resolveBackfillFromActivity(prisma, activity, activityId);
}
