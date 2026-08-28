import type { GeoLocation } from '@/core/environment';
import type { PrismaClient } from '@prisma/client';

const DEFAULT_HOME: GeoLocation = {
  latitude: 48.922778,
  longitude: 2.252222,
  label: 'Colombes, France',
};

/** Where a resolved home location actually came from. */
export type HomeLocationSource = 'profile' | 'default';

export function homeLocationFromEnv(): GeoLocation {
  const latitude = Number(process.env.SHARPIT_DEFAULT_LATITUDE);
  const longitude = Number(process.env.SHARPIT_DEFAULT_LONGITUDE);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { latitude, longitude, label: 'Colombes, France' };
  }
  return DEFAULT_HOME;
}

/**
 * The athlete's home, and whether we actually know it.
 *
 * The last fallback is a hard-coded city. Callers that surface weather or
 * environment to the athlete need to know they are showing someone else's
 * coordinates, or the reading looks like a fact when it is a guess.
 */
export async function resolveHomeLocation(
  prisma: PrismaClient,
  athleteId: string,
): Promise<GeoLocation & { source: HomeLocationSource }> {
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: athleteId },
    select: { homeLocationLabel: true, homeLocationLat: true, homeLocationLng: true },
  });

  if (
    profile?.homeLocationLat !== null &&
    profile.homeLocationLng !== null &&
    Number.isFinite(profile.homeLocationLat) &&
    Number.isFinite(profile.homeLocationLng)
  ) {
    return {
      latitude: profile.homeLocationLat,
      longitude: profile.homeLocationLng,
      label: profile.homeLocationLabel ?? 'Domicile',
      source: 'profile',
    };
  }

  return { ...homeLocationFromEnv(), source: 'default' };
}
