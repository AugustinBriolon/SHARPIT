import { ActivityType, Prisma } from '@prisma/client';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { dedupeBodyCompositionByDay } from '@/lib/body-composition';
import { clientFromTokens } from '@/lib/integrations/garmin';
import { fetchGarminMultisportLegs } from '@/lib/integrations/garmin-multisport';
import { getGarminAccount } from '@/lib/integrations/garmin-sync';
import { isMultisportLegArray, type MultisportLeg } from '@/lib/multisport';
import { prisma } from './prisma';

const activityInclude = {
  runMetrics: true,
  bikeMetrics: true,
  swimMetrics: true,
  strengthSets: { orderBy: { order: 'asc' as const } },
};

export async function getActivities(params?: { type?: ActivityType; limit?: number }) {
  return prisma.activity.findMany({
    where: params?.type ? { type: params.type } : undefined,
    include: activityInclude,
    orderBy: { date: 'desc' },
    take: params?.limit,
  });
}

/**
 * Sélection LÉGÈRE pour les listes/analytics côté client : uniquement les
 * champs réellement affichés ou agrégés (PMC, charge, résumé de ligne). Évite de
 * transférer toutes les sous-métriques de chaque activité (payload ÷ ~3).
 */
const activityListSelect = {
  id: true,
  type: true,
  date: true,
  title: true,
  duration: true,
  load: true,
  rpe: true,
  feeling: true,
  source: true,
  stravaId: true,
  garminId: true,
  createdAt: true,
  updatedAt: true,
  runMetrics: { select: { distanceM: true } },
  bikeMetrics: { select: { tss: true, avgPower: true } },
  swimMetrics: { select: { distanceM: true } },
  strengthSets: { select: { exercise: true }, orderBy: { order: 'asc' as const } },
} satisfies Prisma.ActivitySelect;

export async function getActivitiesList(params?: {
  type?: ActivityType;
  limit?: number;
  sinceDays?: number;
}) {
  const where: Prisma.ActivityWhereInput = {};
  if (params?.type) where.type = params.type;
  if (params?.sinceDays) {
    where.date = { gte: startOfDay(addDays(new Date(), -params.sinceDays)) };
  }
  return prisma.activity.findMany({
    where,
    select: activityListSelect,
    orderBy: { date: 'desc' },
    take: params?.limit,
  });
}

export async function getActivityById(id: string) {
  return prisma.activity.findUnique({
    where: { id },
    include: activityInclude,
  });
}

/** Jambes multisport persistées ou récupérées depuis Garmin si absentes. */
export async function getMultisportLegsForActivity(activity: {
  id: string;
  type: ActivityType;
  garminId: string | null;
  multisportLegs: unknown;
}): Promise<MultisportLeg[] | null> {
  if (activity.type !== ActivityType.TRIATHLON) return null;

  if (isMultisportLegArray(activity.multisportLegs)) {
    return activity.multisportLegs;
  }

  if (!activity.garminId) return null;

  const account = await getGarminAccount();
  if (!account) return null;

  const client = clientFromTokens({
    oauth1: account.oauth1Token,
    oauth2: account.oauth2Token,
  });

  const legs = await fetchGarminMultisportLegs(client, Number(activity.garminId));
  if (!legs) return null;

  await prisma.activity.update({
    where: { id: activity.id },
    data: { multisportLegs: legs as unknown as Prisma.InputJsonValue },
  });

  return legs;
}

export async function createActivity(data: Prisma.ActivityCreateInput) {
  return prisma.activity.create({
    data,
    include: activityInclude,
  });
}

export async function updateActivity(id: string, data: Prisma.ActivityUpdateInput) {
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

  const [todayActivities, recentActivities, todayHealth, primaryGoal] = await Promise.all([
    prisma.activity.findMany({
      where: { date: { gte: today, lt: addDays(today, 1) } },
      include: activityInclude,
      orderBy: { date: 'asc' },
    }),
    prisma.activity.findMany({
      where: { date: { gte: weekAgo } },
      select: { load: true, date: true },
      orderBy: { date: 'desc' },
    }),
    prisma.dailyHealth.findUnique({ where: { date: today } }),
    prisma.goal.findFirst({
      where: {
        kind: 'RACE',
        achieved: false,
        targetDate: { gte: today },
      },
      orderBy: { targetDate: 'asc' },
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
    orderBy: { date: 'asc' },
  });
}

export async function getGoals() {
  return prisma.goal.findMany({
    orderBy: [{ achieved: 'asc' }, { targetDate: 'asc' }, { createdAt: 'desc' }],
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
      kind: 'RACE',
      achieved: false,
      targetDate: { gte: startOfDay(new Date()) },
    },
    orderBy: { targetDate: 'asc' },
  });
}

export async function getHealthEntries(days = 90, refDate: Date = new Date()) {
  const end = endOfDay(refDate);
  const since = startOfDay(addDays(refDate, -(days - 1)));
  return prisma.dailyHealth.findMany({
    where: { date: { gte: since, lte: end } },
    orderBy: { date: 'desc' },
  });
}

export async function getBodyCompositionMeasurements(days?: number) {
  const since = days != null ? startOfDay(addDays(new Date(), -days)) : null;
  const rows = await prisma.bodyCompositionMeasurement.findMany({
    where: since ? { measuredAt: { gte: since } } : undefined,
    orderBy: { measuredAt: 'desc' },
  });
  return dedupeBodyCompositionByDay(rows);
}

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
 * Crée plusieurs séances liées en un seul "brick" (enchaînement multisport,
 * ex. vélo → course). Chaque jambe reste une séance autonome mais partage un
 * `brickGroupId` commun ; `brickOrder` suit l'ordre du tableau fourni.
 */
export async function createBrickSessions(
  legs: Omit<Prisma.PlannedSessionUncheckedCreateInput, 'brickGroupId' | 'brickOrder'>[],
) {
  const brickGroupId = crypto.randomUUID();
  const created = [];
  for (let i = 0; i < legs.length; i++) {
    created.push(
      await prisma.plannedSession.create({
        data: { ...legs[i], brickGroupId, brickOrder: i },
      }),
    );
  }
  return created;
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

const physicalNoteInclude = {
  checkins: { orderBy: { date: 'desc' as const } },
};

export async function getPhysicalNotes() {
  return prisma.physicalNote.findMany({
    include: physicalNoteInclude,
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
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
    where: { status: { not: 'RESOLVED' }, affectsTraining: true },
    include: physicalNoteInclude,
    orderBy: { severity: 'desc' },
  });
}

export async function createPhysicalNote(data: Prisma.PhysicalNoteUncheckedCreateInput) {
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

const PROFILE_ID = 'default';

export async function getAthleteProfile() {
  return prisma.athleteProfile.findUnique({ where: { id: PROFILE_ID } });
}

export async function upsertAthleteProfile(data: {
  heightCm?: number | null;
  birthDate?: Date | null;
  ftpW?: number | null;
  maxHr?: number | null;
  lthr?: number | null;
  runThresholdPaceSecPerKm?: number | null;
  context?: string | null;
  thresholdsSyncedAt?: Date | null;
  sleepTargetMinutes?: number | null;
  sleepBedtimeTargetMin?: number | null;
}) {
  return prisma.athleteProfile.upsert({
    where: { id: PROFILE_ID },
    create: { id: PROFILE_ID, ...data },
    update: data,
  });
}

export async function createThresholdSnapshot(data: {
  source: string;
  ftpW?: number | null;
  lthr?: number | null;
  runThresholdPaceSecPerKm?: number | null;
}) {
  return prisma.athleteThresholdSnapshot.create({
    data: { profileId: PROFILE_ID, ...data },
  });
}

export async function getThresholdSnapshots(limit = 12) {
  return prisma.athleteThresholdSnapshot.findMany({
    where: { profileId: PROFILE_ID },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

const planWeekInclude = { weeks: { orderBy: { weekIndex: 'asc' as const } } };

export async function getActiveTrainingPlan() {
  return prisma.trainingPlan.findFirst({
    where: { status: 'ACTIVE' },
    include: planWeekInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function archiveActiveTrainingPlans() {
  return prisma.trainingPlan.updateMany({
    where: { status: 'ACTIVE' },
    data: { status: 'ARCHIVED' },
  });
}

export async function createTrainingPlan(
  data: Prisma.TrainingPlanUncheckedCreateInput & {
    weeks: Omit<Prisma.PlanWeekUncheckedCreateInput, 'planId'>[];
  },
) {
  const { weeks, ...planData } = data;
  return prisma.trainingPlan.create({
    data: {
      ...planData,
      weeks: { create: weeks },
    },
    include: planWeekInclude,
  });
}

export async function archiveTrainingPlan(id: string) {
  return prisma.trainingPlan.update({
    where: { id },
    data: { status: 'ARCHIVED' },
    include: planWeekInclude,
  });
}
