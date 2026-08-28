import { Prisma } from '@prisma/client';
import { isSet } from '@/lib/util/value';
import { prisma } from '@/lib/prisma';
import { activityInclude, plannedSessionCoachSelect } from '@/lib/queries/activity-include';

const plannedSessionInclude = {
  activity: { include: activityInclude },
};

export async function getPlannedSessions(athleteId: string, params?: { from?: Date; to?: Date }) {
  return prisma.plannedSession.findMany({
    where: {
      athleteId,
      ...(params?.from || params?.to ? { date: { gte: params?.from, lte: params?.to } } : {}),
    },
    include: plannedSessionInclude,
    orderBy: { date: 'asc' },
  });
}

/** Slim planned sessions for Coach context — no activity join. */
export async function getPlannedSessionsForCoach(
  athleteId: string,
  params?: { from?: Date; to?: Date },
) {
  return prisma.plannedSession.findMany({
    where: {
      athleteId,
      ...(params?.from || params?.to ? { date: { gte: params?.from, lte: params?.to } } : {}),
    },
    select: plannedSessionCoachSelect,
    orderBy: { date: 'asc' },
  });
}

export async function getPlannedSessionById(athleteId: string, id: string) {
  return prisma.plannedSession.findFirst({
    where: { id, athleteId },
    include: plannedSessionInclude,
  });
}

export async function linkPlannedSessionActivity(
  athleteId: string,
  id: string,
  activityId: string | null,
) {
  const { count } = await prisma.plannedSession.updateMany({
    where: { id, athleteId },
    data: {
      activityId,
      completed: isSet(activityId),
      ...(activityId === undefined || activityId === null
        ? { analysis: Prisma.DbNull, analyzedAt: null }
        : {}),
    },
  });
  if (count === 0) {
    return null;
  }
  return prisma.plannedSession.findUnique({ where: { id }, include: plannedSessionInclude });
}

export async function setPlannedSessionAnalysis(
  athleteId: string,
  id: string,
  analysis: Prisma.InputJsonValue,
) {
  const { count } = await prisma.plannedSession.updateMany({
    where: { id, athleteId },
    data: { analysis, analyzedAt: new Date() },
  });
  if (count === 0) {
    return null;
  }
  return prisma.plannedSession.findUnique({ where: { id }, include: plannedSessionInclude });
}

export async function createPlannedSession(
  athleteId: string,
  data: Omit<Prisma.PlannedSessionUncheckedCreateInput, 'athleteId'>,
) {
  return prisma.plannedSession.create({ data: { ...data, athleteId } });
}

/**
 * Creates several linked sessions as one brick (multisport chain, e.g. bike → run).
 * Each leg stays an autonomous session but shares a `brickGroupId`;
 * `brickOrder` follows the array order.
 */
export async function createBrickSessions(
  athleteId: string,
  legs: Omit<
    Prisma.PlannedSessionUncheckedCreateInput,
    'athleteId' | 'brickGroupId' | 'brickOrder'
  >[],
) {
  const brickGroupId = crypto.randomUUID();
  return prisma.$transaction(
    legs.map((leg, i) =>
      prisma.plannedSession.create({
        data: { ...leg, athleteId, brickGroupId, brickOrder: i },
      }),
    ),
  );
}

export async function getBrickSessions(athleteId: string, brickGroupId: string) {
  return prisma.plannedSession.findMany({
    where: { brickGroupId, athleteId },
    include: plannedSessionInclude,
    orderBy: { brickOrder: 'asc' },
  });
}

export async function getBrickAnalysis(athleteId: string, brickGroupId: string) {
  return prisma.brickAnalysis.findFirst({ where: { brickGroupId, athleteId } });
}

export async function setBrickAnalysis(
  athleteId: string,
  brickGroupId: string,
  content: Prisma.InputJsonValue,
) {
  return prisma.brickAnalysis.upsert({
    where: { brickGroupId },
    create: { brickGroupId, athleteId, content },
    update: { content, generatedAt: new Date() },
  });
}

export async function updatePlannedSession(
  athleteId: string,
  id: string,
  data: Prisma.PlannedSessionUncheckedUpdateInput,
) {
  const { count } = await prisma.plannedSession.updateMany({ where: { id, athleteId }, data });
  if (count === 0) {
    return null;
  }
  return prisma.plannedSession.findUnique({ where: { id } });
}

export async function deletePlannedSession(athleteId: string, id: string) {
  const owned = await prisma.plannedSession.findFirst({
    where: { id, athleteId },
    select: { id: true },
  });
  if (!owned) {
    return null;
  }
  return prisma.plannedSession.delete({ where: { id } });
}
