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

const plannedSessionInclude = {
  activity: { include: activityInclude },
};

export async function getPlannedSessions(params?: { from?: Date; to?: Date }) {
  return prisma.plannedSession.findMany({
    where:
      params?.from || params?.to
        ? { date: { gte: params?.from, lte: params?.to } }
        : undefined,
    include: plannedSessionInclude,
    orderBy: { date: "asc" },
  });
}

export async function getPlannedSessionById(id: string) {
  return prisma.plannedSession.findUnique({
    where: { id },
    include: plannedSessionInclude,
  });
}

export async function linkPlannedSessionActivity(
  id: string,
  activityId: string | null,
) {
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

export async function setPlannedSessionAnalysis(
  id: string,
  analysis: Prisma.InputJsonValue,
) {
  return prisma.plannedSession.update({
    where: { id },
    data: { analysis, analyzedAt: new Date() },
    include: plannedSessionInclude,
  });
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

const physicalNoteInclude = {
  checkins: { orderBy: { date: "desc" as const } },
};

export async function getPhysicalNotes() {
  return prisma.physicalNote.findMany({
    include: physicalNoteInclude,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
}

export async function getPhysicalNoteById(id: string) {
  return prisma.physicalNote.findUnique({
    where: { id },
    include: physicalNoteInclude,
  });
}

export async function getActivePhysicalNotes() {
  return prisma.physicalNote.findMany({
    where: { status: { not: "RESOLVED" }, affectsTraining: true },
    include: physicalNoteInclude,
    orderBy: { severity: "desc" },
  });
}

export async function createPhysicalNote(
  data: Prisma.PhysicalNoteUncheckedCreateInput,
) {
  return prisma.physicalNote.create({ data, include: physicalNoteInclude });
}

export async function updatePhysicalNote(
  id: string,
  data: Prisma.PhysicalNoteUncheckedUpdateInput,
) {
  return prisma.physicalNote.update({
    where: { id },
    data,
    include: physicalNoteInclude,
  });
}

export async function deletePhysicalNote(id: string) {
  return prisma.physicalNote.delete({ where: { id } });
}

export async function addPhysicalCheckin(
  noteId: string,
  data: { severity?: number | null; comment?: string | null; date?: Date },
) {
  await prisma.physicalCheckin.create({
    data: {
      noteId,
      severity: data.severity ?? null,
      comment: data.comment ?? null,
      ...(data.date ? { date: data.date } : {}),
    },
  });
  // synchronise la sévérité courante de la note avec le dernier point
  if (data.severity != null) {
    await prisma.physicalNote.update({
      where: { id: noteId },
      data: { severity: data.severity },
    });
  }
  return getPhysicalNoteById(noteId);
}

export async function deletePhysicalCheckin(id: string) {
  return prisma.physicalCheckin.delete({ where: { id } });
}

const PROFILE_ID = "default";

export async function getAthleteProfile() {
  return prisma.athleteProfile.findUnique({ where: { id: PROFILE_ID } });
}

export async function upsertAthleteProfile(
  data: {
    ftpW?: number | null;
    maxHr?: number | null;
    lthr?: number | null;
    runThresholdPaceSecPerKm?: number | null;
    context?: string | null;
  },
) {
  return prisma.athleteProfile.upsert({
    where: { id: PROFILE_ID },
    create: { id: PROFILE_ID, ...data },
    update: data,
  });
}
