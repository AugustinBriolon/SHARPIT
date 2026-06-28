import { ActivityType, Prisma } from "@prisma/client";
import { addDays, startOfDay } from "date-fns";
import { prisma } from "./prisma";

const activityInclude = {
  runMetrics: true,
  bikeMetrics: true,
  swimMetrics: true,
  strengthSets: { orderBy: { order: "asc" as const } },
};

export async function getActivities(params?: {
  type?: ActivityType;
  limit?: number;
}) {
  return prisma.activity.findMany({
    where: params?.type ? { type: params.type } : undefined,
    include: activityInclude,
    orderBy: { date: "desc" },
    take: params?.limit,
  });
}

export async function getActivityById(id: string) {
  return prisma.activity.findUnique({
    where: { id },
    include: activityInclude,
  });
}

export async function createActivity(data: Prisma.ActivityCreateInput) {
  return prisma.activity.create({
    data,
    include: activityInclude,
  });
}

export async function updateActivity(
  id: string,
  data: Prisma.ActivityUpdateInput,
) {
  return prisma.activity.update({
    where: { id },
    data,
    include: activityInclude,
  });
}

export async function deleteActivity(id: string) {
  return prisma.activity.delete({ where: { id } });
}

export async function getDashboardData() {
  const today = startOfDay(new Date());
  const weekAgo = addDays(today, -42);

  const [todayActivities, recentActivities, todayHealth, primaryGoal] =
    await Promise.all([
      prisma.activity.findMany({
        where: { date: { gte: today, lt: addDays(today, 1) } },
        include: activityInclude,
        orderBy: { date: "asc" },
      }),
      prisma.activity.findMany({
        where: { date: { gte: weekAgo } },
        select: { load: true, date: true },
        orderBy: { date: "desc" },
      }),
      prisma.dailyHealth.findUnique({ where: { date: today } }),
      prisma.goal.findFirst({
        where: {
          kind: "RACE",
          achieved: false,
          targetDate: { gte: today },
        },
        orderBy: { targetDate: "asc" },
      }),
    ]);

  return {
    todayActivities,
    recentActivities,
    todayHealth,
    primaryGoal,
  };
}

export async function getAnalyticsActivities() {
  return prisma.activity.findMany({
    select: {
      date: true,
      type: true,
      duration: true,
      load: true,
      bikeMetrics: { select: { tss: true } },
    },
    orderBy: { date: "asc" },
  });
}

export async function getGoals() {
  return prisma.goal.findMany({
    orderBy: [{ achieved: "asc" }, { targetDate: "asc" }, { createdAt: "desc" }],
  });
}

export async function getGoalById(id: string) {
  return prisma.goal.findUnique({ where: { id } });
}

export async function createGoal(data: Prisma.GoalCreateInput) {
  return prisma.goal.create({ data });
}

export async function updateGoal(id: string, data: Prisma.GoalUpdateInput) {
  return prisma.goal.update({ where: { id }, data });
}

export async function deleteGoal(id: string) {
  return prisma.goal.delete({ where: { id } });
}

export async function getNextRace() {
  return prisma.goal.findFirst({
    where: {
      kind: "RACE",
      achieved: false,
      targetDate: { gte: startOfDay(new Date()) },
    },
    orderBy: { targetDate: "asc" },
  });
}

export async function getHealthEntries(days = 90) {
  const since = startOfDay(addDays(new Date(), -days));
  return prisma.dailyHealth.findMany({
    where: { date: { gte: since } },
    orderBy: { date: "desc" },
  });
}

export async function getPlannedSessions(params?: { from?: Date; to?: Date }) {
  return prisma.plannedSession.findMany({
    where:
      params?.from || params?.to
        ? { date: { gte: params?.from, lte: params?.to } }
        : undefined,
    orderBy: { date: "asc" },
  });
}

export async function getPlannedSessionById(id: string) {
  return prisma.plannedSession.findUnique({ where: { id } });
}

export async function createPlannedSession(
  data: Prisma.PlannedSessionUncheckedCreateInput,
) {
  return prisma.plannedSession.create({ data });
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
