import { cache } from 'react';
import { after } from 'next/server';
import { dedupeBodyCompositionByDay } from '@/lib/health/body-composition';
import { fetchGarminMultisportLegs } from '@/lib/integrations/garmin/garmin-multisport';
import { buildFreshGarminClient, getGarminAccount } from '@/lib/integrations/garmin/garmin-sync';
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

export async function getActivities(
  athleteId: string,
  params?: { type?: ActivityType; limit?: number },
) {
  return prisma.activity.findMany({
    where: params?.type ? { athleteId, type: params.type } : { athleteId },
    include: activityInclude,
    orderBy: { date: 'desc' },
    take: params?.limit,
  });
}

export async function getActivitiesList(
  athleteId: string,
  params?: {
    type?: ActivityType;
    limit?: number;
    sinceDays?: number;
  },
) {
  const where: Prisma.ActivityWhereInput = { athleteId };
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
export async function getActivitiesForCoach(
  athleteId: string,
  params?: { limit?: number; sinceDays?: number },
) {
  const where: Prisma.ActivityWhereInput = { athleteId };
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
export async function getActivitiesForPmc(athleteId: string) {
  return prisma.activity.findMany({
    where: { athleteId },
    select: activityPmcSelect,
    orderBy: { date: 'asc' },
  });
}

/**
 * Minimal activity rows for AthleteSnapshot phase context.
 * Avoids metrics / strength sets / plannedSession joins used by detail views.
 */
export async function getActivitiesForSnapshotPhase(athleteId: string, limit = 40) {
  return prisma.activity.findMany({
    where: { athleteId },
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
export const getActivityById = cache(async (athleteId: string, id: string) => {
  return prisma.activity.findFirst({
    where: { id, athleteId },
    include: activityInclude,
  });
});

/** Multisport legs — persisted or fetched from Garmin when missing.
 *
 * Persist is intentionally non-blocking: this helper is called from RSC pages
 * where `after()` is not always available. Prefer `after()` when in a request
 * context; otherwise fire-and-forget so the legs return immediately.
 */
export async function getMultisportLegsForActivity(
  athleteId: string,
  activity: {
    id: string;
    type: ActivityType;
    garminId: string | null;
    multisportLegs: unknown;
  },
): Promise<MultisportLeg[] | null> {
  if (activity.type !== ActivityType.TRIATHLON) return null;

  if (isMultisportLegArray(activity.multisportLegs)) {
    return activity.multisportLegs;
  }

  if (!activity.garminId) return null;

  const account = await getGarminAccount(athleteId);
  if (!account) return null;

  const client = await buildFreshGarminClient(athleteId, account).catch(() => null);
  if (!client) return null;

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

export async function createActivity(athleteId: string, data: Prisma.ActivityUncheckedCreateInput) {
  return prisma.activity.create({
    data: { ...data, athleteId },
    include: activityInclude,
  });
}

export async function updateActivity(
  athleteId: string,
  id: string,
  data: Prisma.ActivityUpdateInput,
) {
  const { count } = await prisma.activity.updateMany({ where: { id, athleteId }, data });
  if (count === 0) return null;
  return prisma.activity.findUnique({ where: { id }, include: activityInclude });
}

export async function deleteActivity(athleteId: string, id: string) {
  const owned = await prisma.activity.findFirst({ where: { id, athleteId }, select: { id: true } });
  if (!owned) return null;

  // Prisma onDelete:SetNull only clears activityId — completed/analysis stay.
  // Reuse the full unlink path so the planned session returns to "planned".
  const linked = await prisma.plannedSession.findFirst({
    where: { activityId: id, athleteId },
    select: { id: true },
  });
  if (linked) {
    await linkPlannedSessionActivity(athleteId, linked.id, null);
  }
  return prisma.activity.delete({ where: { id } });
}

export async function getDashboardData(athleteId: string) {
  const today = startOfDay(new Date());
  const weekAgo = addDays(today, -42);

  const [todayActivities, recentActivities, todayHealth, primaryGoal] = await Promise.all([
    prisma.activity.findMany({
      where: { athleteId, date: { gte: today, lt: addDays(today, 1) } },
      include: activityInclude,
      orderBy: { date: 'asc' },
    }),
    prisma.activity.findMany({
      where: { athleteId, date: { gte: weekAgo } },
      select: { load: true, date: true },
      orderBy: { date: 'desc' },
    }),
    prisma.dailyHealth.findUnique({
      where: { athleteId_date: { athleteId, date: today } },
    }),
    prisma.goal.findFirst({
      where: {
        athleteId,
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

export async function getAnalyticsActivities(athleteId: string) {
  return prisma.activity.findMany({
    where: { athleteId },
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

export async function getGoals(athleteId: string) {
  return prisma.goal.findMany({
    where: { athleteId },
    orderBy: [{ achieved: 'asc' }, { targetDate: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function getGoalById(athleteId: string, id: string) {
  return prisma.goal.findFirst({ where: { id, athleteId } });
}

export async function createGoal(athleteId: string, data: Prisma.GoalUncheckedCreateInput) {
  return prisma.goal.create({ data: { ...data, athleteId } });
}

export async function updateGoal(athleteId: string, id: string, data: Prisma.GoalUpdateInput) {
  const { count } = await prisma.goal.updateMany({ where: { id, athleteId }, data });
  if (count === 0) return null;
  return prisma.goal.findUnique({ where: { id } });
}

export async function deleteGoal(athleteId: string, id: string) {
  const owned = await prisma.goal.findFirst({ where: { id, athleteId }, select: { id: true } });
  if (!owned) return null;
  return prisma.goal.delete({ where: { id } });
}

export async function getNextRace(athleteId: string) {
  return prisma.goal.findFirst({
    where: {
      athleteId,
      kind: 'RACE',
      achieved: false,
      targetDate: { gte: startOfDay(new Date()) },
    },
    orderBy: { targetDate: 'asc' },
  });
}

export async function getHealthEntries(athleteId: string, days = 90, refDate: Date = new Date()) {
  const { isProviderEnabledForClass } = await import('@/lib/integrations/source-prefs');
  const { loadResolvedSourcePrefs } = await import('@/lib/integrations/source-prefs-store');
  const prefs = await loadResolvedSourcePrefs(athleteId);
  if (!isProviderEnabledForClass(prefs, 'wearable_health', 'garmin')) {
    return [];
  }
  const end = endOfDay(refDate);
  const since = startOfDay(addDays(refDate, -(days - 1)));
  return prisma.dailyHealth.findMany({
    where: { athleteId, date: { gte: since, lte: end } },
    orderBy: { date: 'desc' },
  });
}

export async function getBodyCompositionMeasurements(athleteId: string, days?: number) {
  const { loadResolvedSourcePrefs } = await import('@/lib/integrations/source-prefs-store');
  const prefs = await loadResolvedSourcePrefs(athleteId);
  const since = days != null ? startOfDay(addDays(new Date(), -days)) : null;
  const rows = await prisma.bodyCompositionMeasurement.findMany({
    where: since ? { athleteId, measuredAt: { gte: since } } : { athleteId },
    orderBy: { measuredAt: 'desc' },
  });
  return dedupeBodyCompositionByDay(rows, prefs.classes.body);
}

const physicalNoteInclude = {
  checkins: { orderBy: { date: 'desc' as const } },
};

export async function getPhysicalNotes(athleteId: string) {
  return prisma.physicalNote.findMany({
    where: { athleteId },
    include: physicalNoteInclude,
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
  });
}

export async function getPhysicalNoteById(athleteId: string, id: string) {
  return prisma.physicalNote.findFirst({
    where: { id, athleteId },
    include: physicalNoteInclude,
  });
}

export async function getActivePhysicalNotes(athleteId: string) {
  return prisma.physicalNote.findMany({
    where: { athleteId, status: { not: 'RESOLVED' }, affectsTraining: true },
    include: physicalNoteInclude,
    orderBy: { severity: 'desc' },
  });
}

export async function createPhysicalNote(
  athleteId: string,
  data: Prisma.PhysicalNoteUncheckedCreateInput,
) {
  return prisma.physicalNote.create({ data: { ...data, athleteId }, include: physicalNoteInclude });
}

export async function updatePhysicalNote(
  athleteId: string,
  id: string,
  data: Prisma.PhysicalNoteUncheckedUpdateInput,
) {
  const { count } = await prisma.physicalNote.updateMany({ where: { id, athleteId }, data });
  if (count === 0) return null;
  return prisma.physicalNote.findUnique({ where: { id }, include: physicalNoteInclude });
}

export async function deletePhysicalNote(athleteId: string, id: string) {
  const owned = await prisma.physicalNote.findFirst({
    where: { id, athleteId },
    select: { id: true },
  });
  if (!owned) return null;
  return prisma.physicalNote.delete({ where: { id } });
}

export async function addPhysicalCheckin(
  athleteId: string,
  noteId: string,
  data: { severity?: number | null; comment?: string | null; date?: Date },
) {
  const note = await prisma.physicalNote.findFirst({
    where: { id: noteId, athleteId },
    select: { id: true },
  });
  if (!note) return null;

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

  const condition = await prisma.condition.findFirst({
    where: { legacyPhysicalNoteId: noteId, athleteId },
  });

  if (condition) {
    const symptomPresent = data.severity != null ? data.severity > 0 : true;
    await prisma.conditionObservation.create({
      data: {
        athleteId,
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

  return getPhysicalNoteById(athleteId, noteId);
}

export async function deletePhysicalCheckin(athleteId: string, id: string) {
  const owned = await prisma.physicalCheckin.findFirst({
    where: { id, note: { athleteId } },
    select: { id: true },
  });
  if (!owned) return null;
  return prisma.physicalCheckin.delete({ where: { id } });
}

/** Per-request dedupe across settings / coach / presentation readers. */
export const getAthleteProfile = cache(async (athleteId: string) => {
  return prisma.athleteProfile.findUnique({ where: { id: athleteId } });
});

export async function upsertAthleteProfile(
  athleteId: string,
  data: {
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
  },
) {
  const { equipment, ...rest } = data;
  const payload = {
    ...rest,
    ...(equipment !== undefined
      ? { equipment: equipment === null ? Prisma.JsonNull : equipment }
      : {}),
  };

  // Every AthleteProfile row now carries a required clerkUserId — there is no
  // longer a placeholder value an upsert's create branch could invent. The
  // multi-tenant migration guarantees this row already exists; a real create
  // path belongs to `getCurrentAthleteId()`'s lazy provisioning instead.
  return prisma.athleteProfile.update({
    where: { id: athleteId },
    data: payload,
  });
}

export async function createThresholdSnapshot(
  athleteId: string,
  data: {
    source: string;
    ftpW?: number | null;
    lthr?: number | null;
    runThresholdPaceSecPerKm?: number | null;
    swimCssSecPer100m?: number | null;
  },
) {
  return prisma.athleteThresholdSnapshot.create({
    data: { profileId: athleteId, ...data },
  });
}

export async function getThresholdSnapshots(athleteId: string, limit = 12) {
  return prisma.athleteThresholdSnapshot.findMany({
    where: { profileId: athleteId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

const planWeekInclude = { weeks: { orderBy: { weekIndex: 'asc' as const } } };

export async function getActiveTrainingPlan(athleteId: string) {
  return prisma.trainingPlan.findFirst({
    where: { athleteId, status: 'ACTIVE' },
    include: planWeekInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function archiveActiveTrainingPlans(athleteId: string) {
  return prisma.trainingPlan.updateMany({
    where: { athleteId, status: 'ACTIVE' },
    data: { status: 'ARCHIVED' },
  });
}

export async function createTrainingPlan(
  athleteId: string,
  data: Omit<Prisma.TrainingPlanUncheckedCreateInput, 'athleteId'> & {
    weeks: Omit<Prisma.PlanWeekUncheckedCreateInput, 'planId'>[];
  },
) {
  const { weeks, ...planData } = data;
  return prisma.trainingPlan.create({
    data: {
      ...planData,
      athleteId,
      weeks: { create: weeks },
    },
    include: planWeekInclude,
  });
}

export async function archiveTrainingPlan(athleteId: string, id: string) {
  const { count } = await prisma.trainingPlan.updateMany({
    where: { id, athleteId },
    data: { status: 'ARCHIVED' },
  });
  if (count === 0) return null;
  return prisma.trainingPlan.findUnique({ where: { id }, include: planWeekInclude });
}
