import type { PrismaClient } from '@prisma/client';
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

/**
 * Resolve and persist activity observed location.
 *
 * Priority:
 * 1. GPS stream midpoint (map track) — overrides a stale travel stamp
 * 2. Existing map / card coords (`observedLocationLat/Lng`)
 * 3. Athlete fallback (travel → home)
 */
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

  const streamData = activity.stream?.data as { latlng?: unknown } | null | undefined;
  const fromStream = streamData?.latlng ? midpointFromLatLng(streamData.latlng) : null;

  if (fromStream) {
    const stored =
      activity.observedLocationLat != null && activity.observedLocationLng != null
        ? {
            latitude: activity.observedLocationLat,
            longitude: activity.observedLocationLng,
          }
        : null;

    if (stored && sameCoords(stored, fromStream) && activity.observedLocationLabel?.trim()) {
      return {
        label: activity.observedLocationLabel,
        ...stored,
      };
    }

    const place = await reverseGeocode(fromStream.latitude, fromStream.longitude);
    const label =
      place?.label ?? `${fromStream.latitude.toFixed(3)}, ${fromStream.longitude.toFixed(3)}`;

    await prisma.activity.update({
      where: { id: activityId },
      data: {
        observedLocationLabel: label,
        observedLocationLat: fromStream.latitude,
        observedLocationLng: fromStream.longitude,
      },
    });

    return { label, latitude: fromStream.latitude, longitude: fromStream.longitude };
  }

  if (activity.observedLocationLat != null && activity.observedLocationLng != null) {
    const coords = {
      latitude: activity.observedLocationLat,
      longitude: activity.observedLocationLng,
    };

    if (activity.observedLocationLabel?.trim()) {
      return {
        label: activity.observedLocationLabel,
        ...coords,
      };
    }

    const place = await reverseGeocode(coords.latitude, coords.longitude);
    const label = place?.label ?? `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`;

    await prisma.activity.update({
      where: { id: activityId },
      data: { observedLocationLabel: label },
    });

    return { label, ...coords };
  }

  const trainingDayId = activity.date.toISOString().slice(0, 10);
  const fallback = await resolveAthleteGeoLocation(prisma, 'default', trainingDayId);
  const coords = { latitude: fallback.latitude, longitude: fallback.longitude };

  const place = await reverseGeocode(coords.latitude, coords.longitude);
  const label =
    fallback.label?.trim() ||
    place?.label ||
    `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`;

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
