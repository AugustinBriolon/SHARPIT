import type { GeoLocation } from '@/core/environment';
import type { PrismaClient } from '@prisma/client';

const DEFAULT_HOME: GeoLocation = {
  latitude: 48.922778,
  longitude: 2.252222,
  label: 'Colombes, France',
};

export function homeLocationFromEnv(): GeoLocation {
  const latitude = Number(process.env.SHARPIT_DEFAULT_LATITUDE);
  const longitude = Number(process.env.SHARPIT_DEFAULT_LONGITUDE);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { latitude, longitude, label: 'Colombes, France' };
  }
  return DEFAULT_HOME;
}

export async function resolveHomeLocation(prisma: PrismaClient): Promise<GeoLocation> {
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: 'default' },
    select: { homeLocationLabel: true, homeLocationLat: true, homeLocationLng: true },
  });

  if (
    profile?.homeLocationLat != null &&
    profile.homeLocationLng != null &&
    Number.isFinite(profile.homeLocationLat) &&
    Number.isFinite(profile.homeLocationLng)
  ) {
    return {
      latitude: profile.homeLocationLat,
      longitude: profile.homeLocationLng,
      label: profile.homeLocationLabel ?? 'Domicile',
    };
  }

  return homeLocationFromEnv();
}
