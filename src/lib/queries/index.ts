import { cache } from 'react';
import { after } from 'next/server';
import { dedupeBodyCompositionByDay } from '@/lib/health/body-composition';
import { clientFromTokens, garminTokensFromStorage } from '@/lib/integrations/garmin/garmin';
import { fetchGarminMultisportLegs } from '@/lib/integrations/garmin/garmin-multisport';
import { getGarminAccount } from '@/lib/integrations/garmin/garmin-sync';
import { isMultisportLegArray, type MultisportLeg } from '@/lib/multisport';
import {
  activityInclude,
  activityListSelect,
  activityCoachSelect,
  activityPmcSelect,
} from '@/lib/queries/activity-include';
import { linkPlannedSessionActivity } from '@/lib/queries/planned-sessions';
import { ActivityType, Prisma } from '@prisma/client';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';
import type { DisplayMode } from '@/lib/preferences/display-mode';

export {
  createBrickSessions,
  createPlannedSession,
  deletePlannedSession,
  getBrickAnalysis,
  getBrickSessions,
  getPlannedSessionById,
  getPlannedSessions,
  getPlannedSessionsForCoach,
  linkPlannedSessionActivity,
  setBrickAnalysis,
  setPlannedSessionAnalysis,
  updatePlannedSession,
} from '@/lib/queries/planned-sessions';

export {
  createHikeTrip,
  deleteHikeTrip,
  getHikeTripById,
  HikeTripConflictError,
  HikeTripValidationError,
  listHikeTrips,
  updateHikeTrip,
  type HikeTripListItem,
  type HikeTripWithActivities,
} from '@/lib/queries/hike-trips';

export async function getActivities(params?: { type?: ActivityType; limit?: number }) {
  return prisma.activity.findMany({
    where: params?.type ? { type: params.type } : undefined,
    include: activityInclude,
    orderBy: { date: 'desc' },
    take: params?.limit,
  });
}

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

/** Slim activities for Coach context assembly (prompt + PMC). */
export async function getActivitiesForCoach(params?: { limit?: number; sinceDays?: number }) {
  const where: Prisma.ActivityWhereInput = {};
  if (params?.sinceDays) {
    where.date = { gte: startOfDay(addDays(new Date(), -params.sinceDays)) };
  }
  return prisma.activity.findMany({
    where,
    select: activityCoachSelect,
    orderBy: { date: 'desc' },
    take: params?.limit,
  });
}

/**
 * Every activity ever recorded, narrowest possible shape, for the PMC.
 *
 * No `sinceDays`, no `limit`, on purpose: the CTL/ATL recurrence converges over
 * ~3x its 42-day time constant, so truncating the input silently understates
 * chronic load. See ADR-011.
 */
export async function getActivitiesForPmc() {
  return prisma.activity.findMany({
    select: activityPmcSelect,
    orderBy: { date: 'asc' },
  });
}

/**
 * Minimal activity rows for AthleteSnapshot phase context.
 * Avoids metrics / strength sets / plannedSession joins used by detail views.
 */
export async function getActivitiesForSnapshotPhase(limit = 40) {
  return prisma.activity.findMany({
    select: {
      id: true,
      date: true,
      type: true,
      load: true,
      duration: true,
      title: true,
    },
    orderBy: { date: 'desc' },
    take: limit,
  });
}

/** Per-request dedupe — detail page + nested helpers share one DB round-trip. */
export const getActivityById = cache(async (id: string) => {
  return prisma.activity.findUnique({
    where: { id },
    include: activityInclude,
  });
});

/** Multisport legs — persisted or fetched from Garmin when missing.
 *
 * Persist is intentionally non-blocking: this helper is called from RSC pages
 * where `after()` is not always available. Prefer `after()` when in a request
 * context; otherwise fire-and-forget so the legs return immediately.
 */
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

  const client = clientFromTokens(
    garminTokensFromStorage(account.oauth1Token, account.oauth2Token),
  );

  const legs = await fetchGarminMultisportLegs(client, Number(activity.garminId));
  if (!legs) return null;

  const persist = () =>
    prisma.activity
      .update({
        where: { id: activity.id },
        data: { multisportLegs: legs as unknown as Prisma.InputJsonValue },
      })
      .catch((err) => {
        console.error('[getMultisportLegsForActivity] persist failed', err);
      });

  try {
    // Prefer after() when in a request context (Route Handlers / supported RSC).
    after(() => {
      void persist();
    });
  } catch {
    // after() only works in request context — do not block returning legs.
    void persist();
  }

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
  // Prisma onDelete:SetNull only clears activityId — completed/analysis stay.
  // Reuse the full unlink path so the planned session returns to "planned".
  const linked = await prisma.plannedSession.findFirst({
    where: { activityId: id },
    select: { id: true },
  });
  if (linked) {
    await linkPlannedSessionActivity(linked.id, null);
  }
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
  const checkin = await prisma.physicalCheckin.create({
    data: {
      noteId,
      severity: data.severity ?? null,
      comment: data.comment ?? null,
      ...(data.date ? { date: data.date } : {}),
    },
  });

  if (data.severity != null) {
    await prisma.physicalNote.update({
      where: { id: noteId },
      data: { severity: data.severity },
    });
  }

  const condition = await prisma.condition.findUnique({
    where: { legacyPhysicalNoteId: noteId },
  });

  if (condition) {
    const symptomPresent = data.severity != null ? data.severity > 0 : true;
    await prisma.conditionObservation.create({
      data: {
        conditionId: condition.id,
        observedAt: data.date ?? new Date(),
        context: 'MANUAL',
        source: 'ATHLETE',
        symptomPresent,
        severityReported: data.severity ?? null,
        functionalImpact:
          data.severity == null
            ? null
            : (() => {
                if (data.severity === 0) return 'NONE';
                if (data.severity <= 3) return 'MILD';
                if (data.severity <= 6) return 'MODERATE';
                if (data.severity <= 8) return 'LIMITING';
                return 'STOPPED';
              })(),
        bodyRegion: condition.bodyRegion,
        side: condition.side,
        type: condition.type,
        comment: data.comment ?? null,
        legacyPhysicalCheckinId: checkin.id,
      },
    });

    await prisma.condition.update({
      where: { id: condition.id },
      data: {
        lastObservationAt: data.date ?? new Date(),
        observationCount: { increment: 1 },
      },
    });
  }

  return getPhysicalNoteById(noteId);
}

export async function deletePhysicalCheckin(id: string) {
  return prisma.physicalCheckin.delete({ where: { id } });
}

const PROFILE_ID = 'default';

/** Per-request dedupe across settings / coach / presentation readers. */
export const getAthleteProfile = cache(async () => {
  return prisma.athleteProfile.findUnique({ where: { id: PROFILE_ID } });
});

export async function upsertAthleteProfile(data: {
  heightCm?: number | null;
  birthDate?: Date | null;
  ftpW?: number | null;
  maxHr?: number | null;
  lthr?: number | null;
  runThresholdPaceSecPerKm?: number | null;
  swimCssSecPer100m?: number | null;
  defaultPoolLengthM?: number | null;
  homeLocationLabel?: string | null;
  homeLocationLat?: number | null;
  homeLocationLng?: number | null;
  context?: string | null;
  thresholdsSyncedAt?: Date | null;
  sleepTargetMinutes?: number | null;
  sleepBedtimeTargetMin?: number | null;
  equipment?: Prisma.InputJsonValue | typeof Prisma.JsonNull | null;
  displayMode?: DisplayMode;
}) {
  const { equipment, ...rest } = data;
  const payload = {
    ...rest,
    ...(equipment !== undefined
      ? { equipment: equipment === null ? Prisma.JsonNull : equipment }
      : {}),
  };

  return prisma.athleteProfile.upsert({
    where: { id: PROFILE_ID },
    create: { id: PROFILE_ID, ...payload },
    update: payload,
  });
}

export async function createThresholdSnapshot(data: {
  source: string;
  ftpW?: number | null;
  lthr?: number | null;
  runThresholdPaceSecPerKm?: number | null;
  swimCssSecPer100m?: number | null;
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
