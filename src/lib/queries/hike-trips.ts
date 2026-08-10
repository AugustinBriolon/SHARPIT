import { cache } from 'react';
import { buildHikeTripSummary, type HikeTripSummary } from '@/lib/activity/hike-trip-summary';
import { prisma } from '@/lib/prisma';
import { ActivityType, Prisma } from '@prisma/client';

const hikeTripActivitySelect = {
  id: true,
  type: true,
  date: true,
  title: true,
  duration: true,
  load: true,
  observedLocationLabel: true,
  hikeMetrics: {
    select: { distanceM: true, elevationM: true, elevationLossM: true },
  },
} satisfies Prisma.ActivitySelect;

type HikeTripActivity = Prisma.ActivityGetPayload<{ select: typeof hikeTripActivitySelect }>;

export type HikeTripWithActivities = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  activities: HikeTripActivity[];
};

export type HikeTripListItem = HikeTripWithActivities & {
  summary: HikeTripSummary;
};

export class HikeTripValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HikeTripValidationError';
  }
}

export class HikeTripConflictError extends Error {
  readonly tripId?: string;
  readonly tripName?: string;

  constructor(message: string, tripId?: string, tripName?: string) {
    super(message);
    this.name = 'HikeTripConflictError';
    this.tripId = tripId;
    this.tripName = tripName;
  }
}

const hikeTripInclude = {
  activities: {
    select: hikeTripActivitySelect,
    orderBy: { date: 'asc' as const },
  },
} satisfies Prisma.HikeTripInclude;

function mapTrip(
  trip: Prisma.HikeTripGetPayload<{ include: typeof hikeTripInclude }>,
): HikeTripWithActivities {
  return {
    id: trip.id,
    name: trip.name,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
    activities: trip.activities,
  };
}

type ActivityMembershipRow = {
  id: string;
  type: ActivityType;
  hikeTripId: string | null;
  hikeTrip: { id: string; name: string } | null;
};

async function loadActivitiesForMembership(ids: string[]): Promise<ActivityMembershipRow[]> {
  return prisma.activity.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      type: true,
      hikeTripId: true,
      hikeTrip: { select: { id: true, name: true } },
    },
  });
}

function assertActivitiesExist(requestedIds: string[], loaded: ActivityMembershipRow[]): void {
  if (loaded.length !== requestedIds.length) {
    throw new HikeTripValidationError('Une ou plusieurs activités sont introuvables');
  }
}

function assertAllHikes(activities: ActivityMembershipRow[]): void {
  if (activities.some((a) => a.type !== ActivityType.HIKE)) {
    throw new HikeTripValidationError('Seules les randonnées peuvent être liées');
  }
}

function assertNotLinkedElsewhere(
  activities: ActivityMembershipRow[],
  currentTripId?: string,
): void {
  for (const activity of activities) {
    if (activity.hikeTripId == null) continue;
    if (currentTripId != null && activity.hikeTripId === currentTripId) continue;
    throw new HikeTripConflictError(
      'Une activité appartient déjà à un autre séjour',
      activity.hikeTrip?.id ?? activity.hikeTripId,
      activity.hikeTrip?.name,
    );
  }
}

/** Per-request dedupe for trip detail + member links. */
export const getHikeTripById = cache(async (id: string): Promise<HikeTripWithActivities | null> => {
  const trip = await prisma.hikeTrip.findUnique({
    where: { id },
    include: hikeTripInclude,
  });
  return trip ? mapTrip(trip) : null;
});

export async function listHikeTrips(): Promise<HikeTripListItem[]> {
  const trips = await prisma.hikeTrip.findMany({
    include: hikeTripInclude,
    orderBy: { updatedAt: 'desc' },
  });

  return trips.map((trip) => {
    const mapped = mapTrip(trip);
    return {
      ...mapped,
      summary: buildHikeTripSummary(mapped.activities),
    };
  });
}

export async function createHikeTrip(input: {
  name: string;
  activityIds: string[];
}): Promise<HikeTripWithActivities> {
  const uniqueIds = [...new Set(input.activityIds)];
  if (uniqueIds.length < 2) {
    throw new HikeTripValidationError('Au moins deux randonnées distinctes');
  }
  const activities = await loadActivitiesForMembership(uniqueIds);
  assertActivitiesExist(uniqueIds, activities);
  assertAllHikes(activities);
  assertNotLinkedElsewhere(activities);

  const trip = await prisma.$transaction(async (tx) => {
    const created = await tx.hikeTrip.create({ data: { name: input.name } });
    await tx.activity.updateMany({
      where: { id: { in: uniqueIds } },
      data: { hikeTripId: created.id },
    });
    return created;
  });

  const result = await getHikeTripById(trip.id);
  if (!result) {
    throw new HikeTripValidationError('Dossier introuvable après création');
  }
  return result;
}

export async function updateHikeTrip(
  id: string,
  patch: {
    name?: string;
    addActivityIds?: string[];
    removeActivityIds?: string[];
  },
): Promise<HikeTripWithActivities> {
  const existing = await getHikeTripById(id);
  if (!existing) {
    throw new HikeTripValidationError('Dossier introuvable');
  }

  const removeIds = [...new Set(patch.removeActivityIds ?? [])];
  const addIds = [...new Set(patch.addActivityIds ?? [])];

  if (removeIds.length > 0) {
    const unknownRemove = removeIds.filter(
      (activityId) => !existing.activities.some((a) => a.id === activityId),
    );
    if (unknownRemove.length > 0) {
      throw new HikeTripValidationError('Une ou plusieurs activités ne font pas partie du dossier');
    }

    const existingIds = new Set(existing.activities.map((a) => a.id));
    const newAddIds = addIds.filter((activityId) => !existingIds.has(activityId));
    const remainingCount = existing.activities.length - removeIds.length + newAddIds.length;
    if (remainingCount < 1) {
      throw new HikeTripValidationError(
        'Impossible de retirer la dernière randonnée — supprimez le dossier',
      );
    }
  }

  if (addIds.length > 0) {
    const activitiesToAdd = await loadActivitiesForMembership(addIds);
    assertActivitiesExist(addIds, activitiesToAdd);
    assertAllHikes(activitiesToAdd);
    assertNotLinkedElsewhere(activitiesToAdd, id);
  }

  await prisma.$transaction(async (tx) => {
    if (patch.name != null) {
      await tx.hikeTrip.update({ where: { id }, data: { name: patch.name } });
    }
    if (removeIds.length > 0) {
      await tx.activity.updateMany({
        where: { id: { in: removeIds }, hikeTripId: id },
        data: { hikeTripId: null },
      });
    }
    if (addIds.length > 0) {
      await tx.activity.updateMany({
        where: { id: { in: addIds } },
        data: { hikeTripId: id },
      });
    }
  });

  const result = await getHikeTripById(id);
  if (!result) {
    throw new HikeTripValidationError('Dossier introuvable après mise à jour');
  }
  return result;
}

export async function deleteHikeTrip(id: string): Promise<void> {
  const existing = await prisma.hikeTrip.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new HikeTripValidationError('Dossier introuvable');
  }

  await prisma.$transaction(async (tx) => {
    await tx.activity.updateMany({
      where: { hikeTripId: id },
      data: { hikeTripId: null },
    });
    await tx.hikeTrip.delete({ where: { id } });
  });
}
