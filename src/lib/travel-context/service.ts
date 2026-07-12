import { addDays, startOfDay } from 'date-fns';
import { Prisma, type PrismaClient } from '@prisma/client';
import { geocodePlaceLabel } from '@/lib/geocoding/nominatim';

export type TravelContextInput = {
  label?: string | null;
  locationLabel: string;
  locationLat?: number | null;
  locationLng?: number | null;
  startDate: Date;
  endDate: Date;
  note?: string | null;
};

export async function resolveTravelContextCoordinates(
  input: Pick<TravelContextInput, 'locationLabel' | 'locationLat' | 'locationLng'>,
): Promise<{ locationLabel: string; locationLat: number; locationLng: number }> {
  if (
    input.locationLat != null &&
    input.locationLng != null &&
    Number.isFinite(input.locationLat) &&
    Number.isFinite(input.locationLng)
  ) {
    return {
      locationLabel: input.locationLabel,
      locationLat: input.locationLat,
      locationLng: input.locationLng,
    };
  }

  const geocoded = await geocodePlaceLabel(input.locationLabel);
  if (!geocoded) {
    throw new Error(`Lieu introuvable : « ${input.locationLabel} »`);
  }

  return {
    locationLabel: geocoded.label,
    locationLat: geocoded.latitude,
    locationLng: geocoded.longitude,
  };
}

export async function getActiveTravelContext(prisma: PrismaClient, onDate = new Date()) {
  const day = startOfDay(onDate);
  return prisma.athleteTravelContext.findFirst({
    where: {
      startDate: { lte: day },
      endDate: { gte: day },
    },
    orderBy: { startDate: 'desc' },
  });
}

export async function listTravelContexts(prisma: PrismaClient) {
  return prisma.athleteTravelContext.findMany({
    orderBy: [{ startDate: 'desc' }],
  });
}

export async function createTravelContext(prisma: PrismaClient, input: TravelContextInput) {
  const coords = await resolveTravelContextCoordinates(input);
  return prisma.athleteTravelContext.create({
    data: {
      label: input.label ?? null,
      locationLabel: coords.locationLabel,
      locationLat: coords.locationLat,
      locationLng: coords.locationLng,
      startDate: startOfDay(input.startDate),
      endDate: startOfDay(input.endDate),
      note: input.note ?? null,
    },
  });
}

export async function deleteTravelContext(prisma: PrismaClient, id: string) {
  return prisma.athleteTravelContext.delete({ where: { id } });
}

export async function applyTravelContextToUpcomingSessions(
  prisma: PrismaClient,
  travelId: string,
): Promise<number> {
  const travel = await prisma.athleteTravelContext.findUnique({ where: { id: travelId } });
  if (!travel) return 0;

  const today = startOfDay(new Date());
  const horizon = addDays(today, 60);

  const sessions = await prisma.plannedSession.findMany({
    where: {
      date: { gte: today, lte: horizon },
      completed: false,
      OR: [
        { exposureSetting: 'OUTDOOR' },
        { exposureSetting: 'UNKNOWN' },
        { exposureSetting: null },
      ],
    },
    select: { id: true, date: true },
  });

  const inWindow = sessions.filter((s) => s.date >= travel.startDate && s.date <= travel.endDate);

  if (inWindow.length === 0) return 0;

  await prisma.plannedSession.updateMany({
    where: { id: { in: inWindow.map((s) => s.id) } },
    data: {
      exposureSetting: 'OUTDOOR',
      locationLabel: travel.locationLabel,
      locationLat: travel.locationLat,
      locationLng: travel.locationLng,
      environmentContext: Prisma.DbNull,
      environmentContextAt: null,
    },
  });

  return inWindow.length;
}
