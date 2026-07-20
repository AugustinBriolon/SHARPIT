import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { activityInclude } from '@/lib/queries/activity-include';

const plannedSessionInclude = {
  activity: { include: activityInclude },
};

export async function getPlannedSessions(params?: { from?: Date; to?: Date }) {
  return prisma.plannedSession.findMany({
    where:
      params?.from || params?.to ? { date: { gte: params?.from, lte: params?.to } } : undefined,
    include: plannedSessionInclude,
    orderBy: { date: 'asc' },
  });
}

export async function getPlannedSessionById(id: string) {
  return prisma.plannedSession.findUnique({
    where: { id },
    include: plannedSessionInclude,
  });
}

export async function linkPlannedSessionActivity(id: string, activityId: string | null) {
  return prisma.plannedSession.update({
    where: { id },
    data: {
      activityId,
      completed: activityId != null,
      ...(activityId == null ? { analysis: Prisma.DbNull, analyzedAt: null } : {}),
    },
    include: plannedSessionInclude,
  });
}

export async function setPlannedSessionAnalysis(id: string, analysis: Prisma.InputJsonValue) {
  return prisma.plannedSession.update({
    where: { id },
    data: { analysis, analyzedAt: new Date() },
    include: plannedSessionInclude,
  });
}

export async function createPlannedSession(data: Prisma.PlannedSessionUncheckedCreateInput) {
  return prisma.plannedSession.create({ data });
}

/**
 * Creates several linked sessions as one brick (multisport chain, e.g. bike → run).
 * Each leg stays an autonomous session but shares a `brickGroupId`;
 * `brickOrder` follows the array order.
 */
export async function createBrickSessions(
  legs: Omit<Prisma.PlannedSessionUncheckedCreateInput, 'brickGroupId' | 'brickOrder'>[],
) {
  const brickGroupId = crypto.randomUUID();
  return prisma.$transaction(
    legs.map((leg, i) =>
      prisma.plannedSession.create({
        data: { ...leg, brickGroupId, brickOrder: i },
      }),
    ),
  );
}

export async function getBrickSessions(brickGroupId: string) {
  return prisma.plannedSession.findMany({
    where: { brickGroupId },
    include: plannedSessionInclude,
    orderBy: { brickOrder: 'asc' },
  });
}

export async function getBrickAnalysis(brickGroupId: string) {
  return prisma.brickAnalysis.findUnique({ where: { brickGroupId } });
}

export async function setBrickAnalysis(brickGroupId: string, content: Prisma.InputJsonValue) {
  return prisma.brickAnalysis.upsert({
    where: { brickGroupId },
    create: { brickGroupId, content },
    update: { content, generatedAt: new Date() },
  });
}

export async function updatePlannedSession(
  id: string,
  data: Prisma.PlannedSessionUncheckedUpdateInput,
) {
  return prisma.plannedSession.update({ where: { id }, data });
}

export async function deletePlannedSession(id: string) {
  return prisma.plannedSession.delete({ where: { id } });
}
