import type { PrismaClient } from '@prisma/client';
import { reverseGeocode } from '@/lib/geocoding/nominatim';
import { resolveAthleteGeoLocation } from '@/lib/environment/athlete-location';

function midpointFromLatLng(latlng: unknown): { latitude: number; longitude: number } | null {
  if (!Array.isArray(latlng) || latlng.length === 0) return null;
  const points = latlng.filter(
    (p): p is [number, number] =>
      Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number',
  );
  if (points.length === 0) return null;
  const mid = points[Math.floor(points.length / 2)];
  return { latitude: mid[0], longitude: mid[1] };
}

export async function backfillActivityObservedLocation(
  prisma: PrismaClient,
  activityId: string,
): Promise<{ label: string; latitude: number; longitude: number } | null> {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      observedLocationLat: true,
      observedLocationLng: true,
      observedLocationLabel: true,
      date: true,
      stream: { select: { data: true } },
    },
  });

  if (!activity) return null;

  if (
    activity.observedLocationLat != null &&
    activity.observedLocationLng != null &&
    activity.observedLocationLabel
  ) {
    return {
      label: activity.observedLocationLabel,
      latitude: activity.observedLocationLat,
      longitude: activity.observedLocationLng,
    };
  }

  const streamData = activity.stream?.data as { latlng?: unknown } | null | undefined;
  let coords = streamData?.latlng ? midpointFromLatLng(streamData.latlng) : null;

  if (!coords) {
    const trainingDayId = activity.date.toISOString().slice(0, 10);
    const fallback = await resolveAthleteGeoLocation(prisma, 'default', trainingDayId);
    coords = { latitude: fallback.latitude, longitude: fallback.longitude };
  }

  const place = await reverseGeocode(coords.latitude, coords.longitude);
  const label = place?.label ?? `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`;

  await prisma.activity.update({
    where: { id: activityId },
    data: {
      observedLocationLabel: label,
      observedLocationLat: coords.latitude,
      observedLocationLng: coords.longitude,
    },
  });

  return { label, latitude: coords.latitude, longitude: coords.longitude };
}
