import type { PrismaClient } from '@prisma/client';
import { resolveHomeLocation } from '@/lib/geocoding/home-location';
import { getActiveTravelContext } from '@/lib/travel-context/service';

export type DefaultActivityLocation = {
  latitude: number;
  longitude: number;
  label: string;
  source: 'travel' | 'home';
};

/** Lieu par défaut pour une activité : vacances actives à la date, sinon domicile. */
export async function resolveDefaultActivityLocation(
  prisma: PrismaClient,
  onDate = new Date(),
): Promise<DefaultActivityLocation> {
  const travel = await getActiveTravelContext(prisma, onDate);
  if (travel) {
    return {
      latitude: travel.locationLat,
      longitude: travel.locationLng,
      label: travel.locationLabel,
      source: 'travel',
    };
  }

  const home = await resolveHomeLocation(prisma);
  return {
    latitude: home.latitude,
    longitude: home.longitude,
    label: home.label ?? 'Domicile',
    source: 'home',
  };
}
