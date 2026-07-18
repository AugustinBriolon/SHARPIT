import { addDays } from 'date-fns';
import {
  Prisma,
  type AthleteMemoryEntryType,
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
  /** Defaults to TRAVEL. CONSTRAINT entries have no location. */
  type?: AthleteMemoryEntryType;
  label?: string | null;
  /** Required when type is TRAVEL (or omitted); ignored for CONSTRAINT. */
  locationLabel?: string | null;
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
  input: Pick<TravelContextInput, 'locationLabel' | 'locationLat' | 'locationLng'> & {
    locationLabel: string;
  },
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

/** CONSTRAINT entries have no place; TRAVEL entries require one (geocoded if needed). */
async function resolveLocationFields(input: TravelContextInput): Promise<{
  locationLabel: string | null;
  locationLat: number | null;
  locationLng: number | null;
}> {
  if ((input.type ?? 'TRAVEL') === 'CONSTRAINT') {
    return { locationLabel: null, locationLat: null, locationLng: null };
  }
  if (!input.locationLabel) {
    throw new Error('Un lieu est requis pour un déplacement.');
  }
  return resolveTravelContextCoordinates({
    locationLabel: input.locationLabel,
    locationLat: input.locationLat,
    locationLng: input.locationLng,
  });
}

export async function getActiveTravelContext(prisma: PrismaClient, onDate = new Date()) {
  const day = toUtcDateOnly(onDate);
  const travel = await prisma.athleteTravelContext.findFirst({
    where: {
      type: 'TRAVEL',
      startDate: { lte: day },
      endDate: { gte: day },
    },
    orderBy: { startDate: 'desc' },
  });
  if (!travel) return null;
  // type: 'TRAVEL' is filtered above — location is always resolved for these rows.
  return {
    ...travel,
    locationLabel: travel.locationLabel as string,
    locationLat: travel.locationLat as number,
    locationLng: travel.locationLng as number,
  };
}

export async function listTravelContexts(prisma: PrismaClient) {
  return prisma.athleteTravelContext.findMany({
    orderBy: [{ startDate: 'desc' }],
  });
}

export async function createTravelContext(prisma: PrismaClient, input: TravelContextInput) {
  const coords = await resolveLocationFields(input);
  const training = resolveTrainingFields(input);
  return prisma.athleteTravelContext.create({
    data: {
      type: input.type ?? 'TRAVEL',
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
  const coords = await resolveLocationFields(input);
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
  if (!travel || travel.type !== 'TRAVEL') return 0;

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
