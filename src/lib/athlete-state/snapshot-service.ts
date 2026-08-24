import type { AthleteSnapshot, AthleteSnapshotBriefing } from '@/core/athlete-state/snapshot';
import {
  buildAthleteSnapshot,
  type SnapshotBuildInput,
} from '@/lib/athlete-state/snapshot-builder';
import { computeFreshnessSnapshot } from '@/lib/athlete-state/freshness-service';
import { shouldRefreshSnapshotForPhaseDrift } from '@/lib/athlete-state/snapshot-phase';
import { isForwardAdvicePhase } from '@/lib/daily-phase/resolve';
import { getDailyBriefing } from '@/lib/briefing/daily-briefing';
import {
  getLatestAthleteSnapshot,
  getSnapshotByFingerprint,
  saveAthleteSnapshot,
} from '@/infrastructure/athlete-state/snapshot-repository';
import { loadTodayState } from '@/lib/today/today-state-server';
import type { TodayState } from '@/hooks/use-today';
import { enrichGoalsWithProgress } from '@/lib/goals/goal-achievements';
import {
  getActivitiesForSnapshotPhase,
  getAthleteProfile,
  getGoals,
  getHealthEntries,
  getPlannedSessions,
} from '@/lib/queries';
import { analyzeSleep, toSleepEntryInputs } from '@/lib/sleep/sleep';
import { addDays, startOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';

function phaseNarrativeNeedsUpgrade(snapshot: AthleteSnapshot): boolean {
  const phase = snapshot.dailyPhase?.phase;
  if (!phase || !snapshot.phaseNarrative) return false;
  if (!snapshot.phaseNarrative.posture) return true;
  if (/à protéger|demain à protéger|demain : ménage/i.test(snapshot.phaseNarrative.heroHeadline))
    return true;
  if (isForwardAdvicePhase(phase)) return false;
  return /entraîne-toi|train hard/i.test(snapshot.phaseNarrative.heroSubline);
}

async function loadBriefingForDay(
  athleteId: string,
  trainingDayId: string,
): Promise<AthleteSnapshotBriefing | null> {
  const refDate = new Date(`${trainingDayId}T12:00:00.000Z`);
  const row = await getDailyBriefing(athleteId, refDate);
  if (!row) return null;
  return {
    content: row.content,
    generatedAt: row.generatedAt.toISOString(),
    readiness: row.readiness,
  };
}

async function loadPhaseObservationSignals(athleteId: string, trainingDayId: string) {
  const [latestSession, latestSleep] = await Promise.all([
    prisma.observation.findFirst({
      where: { athleteId, type: 'SESSION', trainingDayId },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    }),
    prisma.observation.findFirst({
      where: { athleteId, type: 'SLEEP', trainingDayId },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    }),
  ]);

  const sleepLoggedTonight = Boolean(
    latestSleep?.timestamp && latestSleep.timestamp.getHours() >= 18,
  );

  return {
    latestSessionObservationAt: latestSession?.timestamp ?? null,
    sleepLoggedTonight,
  };
}

async function loadSnapshotPhaseContext(
  athleteId: string,
  trainingDayId: string,
  priorSnapshot: AthleteSnapshot | null,
  refDate: Date = new Date(),
) {
  const dayStart = startOfDay(refDate);
  const dayEnd = startOfDay(addDays(refDate, 1));
  const [activities, plannedSessions, rawGoals, athleteProfile, healthEntries, observationSignals] =
    await Promise.all([
      getActivitiesForSnapshotPhase(athleteId, 40),
      getPlannedSessions(athleteId, { from: dayStart, to: dayEnd }),
      getGoals(athleteId),
      getAthleteProfile(athleteId),
      getHealthEntries(athleteId, 14, refDate),
      loadPhaseObservationSignals(athleteId, trainingDayId),
    ]);
  const goals = await enrichGoalsWithProgress(athleteId, rawGoals);

  const sleepCoach = analyzeSleep(toSleepEntryInputs(healthEntries), {
    targetDurationMin: athleteProfile?.sleepTargetMinutes,
    bedtimeTargetMin: athleteProfile?.sleepBedtimeTargetMin,
  });

  return {
    refDate,
    activities: activities.map((a) => ({
      id: a.id,
      date: a.date,
      type: a.type,
      load: a.load,
      duration: a.duration,
      title: a.title,
    })),
    plannedSessions: plannedSessions.map((p) => ({
      id: p.id,
      date: p.date,
      type: p.type,
      startTime: p.startTime,
      completed: p.completed,
      activityId: p.activityId,
      title: p.title,
      goalId: p.goalId,
    })),
    goals,
    sleepCoach,
    sleepBedtimeTargetMin: athleteProfile?.sleepBedtimeTargetMin ?? null,
    priorSnapshot: priorSnapshot
      ? { generatedAt: priorSnapshot.generatedAt, dailyPhase: priorSnapshot.dailyPhase }
      : null,
    ...observationSignals,
  };
}

export type GenerateSnapshotOptions = {
  athleteId: string;
  trainingDayId: string;
  todayState?: TodayState;
  forceRefresh?: boolean;
  skipPersist?: boolean;
  refDate?: Date;
};

/**
 * Regenerate snapshot only when inference inputs changed (idempotent).
 */
export async function generateAthleteSnapshot(
  options: GenerateSnapshotOptions,
): Promise<AthleteSnapshot> {
  const { athleteId, trainingDayId } = options;
  const refDate = options.refDate ?? new Date();

  const priorSnapshot = await getLatestAthleteSnapshot({ athleteId, trainingDayId });

  const [todayState, freshness, briefing, phaseContext] = await Promise.all([
    options.todayState ??
      loadTodayState({
        athleteId,
        trainingDayId,
        forceRefresh: options.forceRefresh ?? false,
      }),
    computeFreshnessSnapshot({ athleteId, trainingDayId }),
    loadBriefingForDay(athleteId, trainingDayId),
    loadSnapshotPhaseContext(athleteId, trainingDayId, priorSnapshot, refDate),
  ]);

  const buildInput: SnapshotBuildInput = {
    athleteId,
    trainingDayId,
    todayState,
    freshness,
    briefing,
    phaseContext,
  };

  const snapshot = buildAthleteSnapshot(buildInput);
  const existing = await getSnapshotByFingerprint(athleteId, trainingDayId, snapshot.snapshotId);
  if (existing) return existing;

  if (!options.skipPersist) {
    await saveAthleteSnapshot(snapshot);
  }

  return snapshot;
}

export async function getOrBuildAthleteSnapshot(
  athleteId: string,
  trainingDayId: string,
): Promise<AthleteSnapshot> {
  const [persisted, latestBriefing] = await Promise.all([
    getLatestAthleteSnapshot({
      athleteId,
      trainingDayId,
    }),
    loadBriefingForDay(athleteId, trainingDayId),
  ]);

  if (persisted) {
    const briefingChanged =
      latestBriefing?.generatedAt !== persisted.briefing?.generatedAt ||
      (latestBriefing && !persisted.briefing);
    const needsTruthfulnessUpgrade = typeof persisted.adviceActionable !== 'boolean';
    const needsDailyPhase = !persisted.dailyPhase || !persisted.phaseNarrative;
    const needsPhaseDrift = shouldRefreshSnapshotForPhaseDrift(persisted);
    const needsNarrativeUpgrade = phaseNarrativeNeedsUpgrade(persisted);

    if (
      !briefingChanged &&
      !needsTruthfulnessUpgrade &&
      !needsDailyPhase &&
      !needsPhaseDrift &&
      !needsNarrativeUpgrade
    ) {
      return persisted;
    }

    return generateAthleteSnapshot({
      athleteId,
      trainingDayId,
      todayState: {
        reasoning: persisted.reasoning,
        decision: persisted.decision ?? null,
        recovery: persisted.recovery,
        fatigue: persisted.fatigue,
        adaptation: persisted.adaptation,
        physicalHealth: persisted.physicalHealth,
        environment: persisted.environment ?? null,
        dailyStrain: persisted.dailyStrain,
      },
      forceRefresh: false,
    });
  }

  return generateAthleteSnapshot({ athleteId, trainingDayId, forceRefresh: false });
}

export async function regenerateAthleteSnapshotAfterInference(
  athleteId: string,
  trainingDayId: string,
  todayState: TodayState,
): Promise<AthleteSnapshot> {
  return generateAthleteSnapshot({
    athleteId,
    trainingDayId,
    todayState,
    forceRefresh: false,
  });
}

export async function regenerateAthleteSnapshotAfterBriefing(
  athleteId: string,
  trainingDayId?: string,
): Promise<AthleteSnapshot | null> {
  const dayId = trainingDayId ?? new Date().toISOString().slice(0, 10);

  const existing = await getLatestAthleteSnapshot({
    athleteId,
    trainingDayId: dayId,
  });
  if (!existing) return null;

  return generateAthleteSnapshot({
    athleteId,
    trainingDayId: dayId,
    todayState: {
      reasoning: existing.reasoning,
      decision: existing.decision ?? null,
      recovery: existing.recovery,
      fatigue: existing.fatigue,
      adaptation: existing.adaptation,
      physicalHealth: existing.physicalHealth,
      environment: existing.environment ?? null,
      dailyStrain: existing.dailyStrain,
    },
    forceRefresh: false,
  });
}

export { shouldRefreshSnapshotForPhaseDrift };
