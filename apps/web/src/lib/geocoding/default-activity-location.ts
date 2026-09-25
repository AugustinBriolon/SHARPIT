import type { PrismaClient } from '@prisma/client';
import { resolveHomeLocation } from '@/lib/geocoding/home-location';
import { getActiveTravelContext } from '@/lib/travel-context/service';

export type DefaultActivityLocation = {
  latitude: number;
  longitude: number;
  label: string;
  /** `default` = nothing configured, these are hard-coded coordinates. */
  source: 'travel' | 'home' | 'default';
};

/** Lieu par défaut pour une activité : vacances actives à la date, sinon domicile. */
export async function resolveDefaultActivityLocation(
  prisma: PrismaClient,
  athleteId: string,
  onDate = new Date(),
): Promise<DefaultActivityLocation> {
  const travel = await getActiveTravelContext(prisma, athleteId, onDate);
  if (travel) {
    return {
      latitude: travel.locationLat,
      longitude: travel.locationLng,
      label: travel.locationLabel,
      source: 'travel',
    };
  }

  const home = await resolveHomeLocation(prisma, athleteId);
  return {
    latitude: home.latitude,
    longitude: home.longitude,
    label: home.label ?? 'Domicile',
    source: home.source === 'profile' ? 'home' : 'default',
  };
}
