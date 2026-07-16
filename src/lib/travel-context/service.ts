import { addDays } from 'date-fns';
import {
  Prisma,
  type CoachMemorySource,
  type PrismaClient,
  type TravelDiscipline,
  type TravelTrainingConstraint,
} from '@prisma/client';
import { geocodePlaceLabel } from '@/lib/geocoding/nominatim';
import { toUtcDateOnly } from '@/lib/travel-context/calendar-date';
import {
  deriveTravelTrainingConstraint,
  normalizeTravelDisciplines,
} from '@/lib/travel-context/disciplines';
import { isTravelTrainingConstraint } from '@/lib/travel-context/training-constraint';

export type TravelContextInput = {
  label?: string | null;
  locationLabel: string;
  locationLat?: number | null;
  locationLng?: number | null;
  startDate: Date;
  endDate: Date;
  note?: string | null;
  trainingConstraint?: TravelTrainingConstraint | null;
  allowedDisciplines?: TravelDiscipline[] | null;
  noStructuredTraining?: boolean;
  source?: CoachMemorySource;
};

function resolveTrainingFields(input: TravelContextInput): {
  allowedDisciplines: TravelDiscipline[];
  trainingConstraint: TravelTrainingConstraint;
} {
  const allowedDisciplines = normalizeTravelDisciplines(input.allowedDisciplines ?? []);

  if (input.noStructuredTraining) {
    return { allowedDisciplines: [], trainingConstraint: 'NONE' };
  }

  if (allowedDisciplines.length > 0) {
    return {
      allowedDisciplines,
      trainingConstraint: deriveTravelTrainingConstraint(allowedDisciplines),
    };
  }

  if (isTravelTrainingConstraint(input.trainingConstraint)) {
    return { allowedDisciplines: [], trainingConstraint: input.trainingConstraint };
  }

  return { allowedDisciplines: [], trainingConstraint: 'FULL' };
}

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
  const day = toUtcDateOnly(onDate);
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
  const training = resolveTrainingFields(input);
  return prisma.athleteTravelContext.create({
    data: {
      label: input.label ?? null,
      locationLabel: coords.locationLabel,
      locationLat: coords.locationLat,
      locationLng: coords.locationLng,
      startDate: toUtcDateOnly(input.startDate),
      endDate: toUtcDateOnly(input.endDate),
      note: input.note ?? null,
      trainingConstraint: training.trainingConstraint,
      allowedDisciplines: training.allowedDisciplines,
      source: input.source ?? 'USER',
    },
  });
}

export async function updateTravelContext(
  prisma: PrismaClient,
  id: string,
  input: TravelContextInput,
) {
  const coords = await resolveTravelContextCoordinates(input);
  const training = resolveTrainingFields(input);
  return prisma.athleteTravelContext.update({
    where: { id },
    data: {
      label: input.label ?? null,
      locationLabel: coords.locationLabel,
      locationLat: coords.locationLat,
      locationLng: coords.locationLng,
      startDate: toUtcDateOnly(input.startDate),
      endDate: toUtcDateOnly(input.endDate),
      note: input.note ?? null,
      trainingConstraint: training.trainingConstraint,
      allowedDisciplines: training.allowedDisciplines,
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

  const today = toUtcDateOnly(new Date());
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
