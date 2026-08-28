import type {
  AthleteSnapshot,
  SnapshotActivityInput,
  SnapshotPlannedSessionInput,
} from '@/core/athlete-state/snapshot';
import type { PhaseNarrative } from '@/lib/daily-phase/narrative';
import { isSet } from '@/lib/util/value';
import { buildPhaseNarrative } from '@/lib/daily-phase/narrative';
import { buildDailyPhaseDayContext, minutesBetween } from '@/lib/daily-phase/day-context';
import { resolveDailyPhase, isForwardAdvicePhase } from '@/lib/daily-phase/resolve';
import type { DailyPhaseResolution } from '@/lib/daily-phase/types';
import { buildTopActionLine } from '@/lib/today/today-rich-view';
import { buildTodayEffortSnapshot } from '@/lib/today/today-narrative-context';
import type { ClientGoal } from '@/lib/query/types';
import { resolveTodayGoalContext } from '@/lib/daily-phase/goal-context';
import { pickTomorrowSessionHint } from '@/lib/daily-phase/evening-context';
import { formatLimitingFactorMessage } from '@/lib/athlete-state/snapshot-truthfulness';
import type { TodayState } from '@/hooks/use-today';
import {
  decisionTopAction,
  decisionVerdict,
  limitingFactorFromDecision,
} from '@/lib/decision/projection';
import { activityMatchesTrainingDay } from '@/lib/training/training-day';
import type { SleepCoachView } from '@/lib/sleep/sleep';

export type { SnapshotActivityInput, SnapshotPlannedSessionInput };

export type SnapshotPhaseBuildParams = {
  refDate: Date;
  trainingDayId: string;
  todayState: TodayState;
  activities: SnapshotActivityInput[];
  plannedSessions: SnapshotPlannedSessionInput[];
  goals: ClientGoal[];
  sleepCoach: Pick<
    SleepCoachView,
    'recommendedBedtimeMin' | 'recommendedDurationMin' | 'debt7Min' | 'hasData'
  >;
  sleepBedtimeTargetMin: number | null;
  priorSnapshot: Pick<AthleteSnapshot, 'generatedAt' | 'dailyPhase'> | null;
  latestSessionObservationAt: Date | string | null;
  sleepLoggedTonight: boolean;
  adviceActionable: boolean;
};

function totalTssToday(activities: SnapshotActivityInput[], trainingDayId: string): number | null {
  const today = activities.filter((a) => activityMatchesTrainingDay(a.date, trainingDayId));
  if (today.length === 0) {
    return null;
  }
  return Math.round(today.reduce((sum, a) => sum + (a.load ?? 0), 0));
}

function isAfterPriorSnapshot(
  timestamp: Date | string | null | undefined,
  priorGeneratedAt: string | null,
): boolean {
  return Boolean(
    timestamp &&
    priorGeneratedAt &&
    new Date(timestamp).getTime() > new Date(priorGeneratedAt).getTime(),
  );
}

function recommendationAvailableForDecision(decision: TodayState['decision']): boolean {
  if (decision?.topAction) {
    return true;
  }
  return decision?.primaryDecision.verdict !== 'INSUFFICIENT_DATA';
}

function dailyStrainAvailableForState(dailyStrain: TodayState['dailyStrain']): boolean {
  return Boolean(dailyStrain?.available && isSet(dailyStrain.strainScore));
}

function minutesSinceLastActivity(
  dayContext: ReturnType<typeof buildDailyPhaseDayContext>,
  refDate: Date,
): number | null {
  if (!dayContext.lastActivityAt) {
    return null;
  }
  return minutesBetween(dayContext.lastActivityAt, refDate);
}

function buildPhaseAthleteSignals(
  params: SnapshotPhaseBuildParams,
  dayContext: ReturnType<typeof buildDailyPhaseDayContext>,
) {
  const {
    refDate,
    todayState,
    priorSnapshot,
    latestSessionObservationAt,
    sleepLoggedTonight,
    adviceActionable,
  } = params;
  const priorGeneratedAt = priorSnapshot?.generatedAt ?? null;
  const newSessionSincePriorSnapshot = isAfterPriorSnapshot(
    latestSessionObservationAt,
    priorGeneratedAt,
  );

  return {
    recommendationAvailable: recommendationAvailableForDecision(todayState.decision),
    adviceActionable,
    dailyStrainAvailable: dailyStrainAvailableForState(todayState.dailyStrain),
    newSessionSincePriorSnapshot,
    newInferenceSincePriorSnapshot: isAfterPriorSnapshot(
      todayState.decision?.computedAt,
      priorGeneratedAt,
    ),
    newObservationsSincePriorSnapshot: newSessionSincePriorSnapshot,
    minutesSinceLastActivity: minutesSinceLastActivity(dayContext, refDate),
    minutesSinceSnapshotGenerated: priorGeneratedAt
      ? minutesBetween(priorGeneratedAt, refDate)
      : null,
    priorPhase: priorSnapshot?.dailyPhase?.phase ?? null,
    sleepLoggedTonight,
  };
}

function buildEveningNarrativeContext(
  params: SnapshotPhaseBuildParams,
  resolution: DailyPhaseResolution,
  effort: ReturnType<typeof buildTodayEffortSnapshot>,
) {
  const { refDate, plannedSessions, sleepCoach, sleepBedtimeTargetMin } = params;
  return {
    effortLevel: effort?.level ?? null,
    totalDurationMin: isSet(effort?.totalDurationSec)
      ? Math.round(effort.totalDurationSec / 60)
      : null,
    completedSessionCount: resolution.signals.completedSessionCount,
    tomorrowSession: pickTomorrowSessionHint(refDate, plannedSessions),
    sleep: {
      recommendedBedtimeMin: sleepCoach.recommendedBedtimeMin,
      recommendedDurationMin: sleepCoach.recommendedDurationMin,
      debt7Min: sleepCoach.debt7Min,
      hasSleepHistory: sleepCoach.hasData,
      bedtimeTargetMin: sleepBedtimeTargetMin,
    },
  };
}

function buildPhaseNarrativeInput(input: {
  params: SnapshotPhaseBuildParams;
  resolution: DailyPhaseResolution;
  effort: ReturnType<typeof buildTodayEffortSnapshot>;
  athleteSignals: ReturnType<typeof buildPhaseAthleteSignals>;
  limitingFactorMessage: string | null;
  goalContext: ReturnType<typeof resolveTodayGoalContext>;
  actionLine: string | null;
  verdict: ReturnType<typeof decisionVerdict>;
}): PhaseNarrative {
  const {
    params,
    resolution,
    effort,
    athleteSignals,
    limitingFactorMessage,
    goalContext,
    actionLine,
    verdict,
  } = input;
  const { trainingDayId, todayState, activities, adviceActionable } = params;

  return buildPhaseNarrative({
    resolution,
    verdict,
    adviceActionable,
    actionLine,
    sportLabel: effort?.sportLabel ?? null,
    totalTssToday: totalTssToday(activities, trainingDayId),
    dailyStrainScore: todayState.dailyStrain?.strainScore ?? null,
    dailyStrainAvailable: athleteSignals.dailyStrainAvailable,
    limitingFactorMessage,
    goalContext,
    evening: buildEveningNarrativeContext(params, resolution, effort),
  });
}

export function buildSnapshotDailyPhase(params: SnapshotPhaseBuildParams): {
  dailyPhase: DailyPhaseResolution;
  phaseNarrative: PhaseNarrative;
} {
  const { refDate, trainingDayId, todayState, activities, plannedSessions, goals } = params;

  const dayContext = buildDailyPhaseDayContext(
    refDate,
    activities as never,
    plannedSessions as never,
    { trainingDayId },
  );

  const athleteSignals = buildPhaseAthleteSignals(params, dayContext);
  const resolution = resolveDailyPhase(
    {
      dayContext,
      athlete: athleteSignals,
      localHour: refDate.getHours(),
    },
    refDate,
  );

  const effort = buildTodayEffortSnapshot(activities as never, refDate);
  const verdict = decisionVerdict(todayState.decision);
  const actionLine = isForwardAdvicePhase(resolution.phase)
    ? buildTopActionLine(decisionTopAction(todayState.decision))
    : null;
  const goalContext = resolveTodayGoalContext(goals ?? [], plannedSessions, trainingDayId);
  const decisionLimiting = limitingFactorFromDecision(todayState.decision);
  const limitingFactorMessage = decisionLimiting
    ? formatLimitingFactorMessage(decisionLimiting)
    : null;

  const phaseNarrative = buildPhaseNarrativeInput({
    params,
    resolution,
    effort,
    athleteSignals,
    limitingFactorMessage,
    goalContext,
    actionLine,
    verdict,
  });

  return { dailyPhase: resolution, phaseNarrative };
}

const PHASE_MAX_AGE_MINUTES: Partial<Record<DailyPhaseResolution['phase'], number>> = {
  SESSION_COMPLETED: 55,
  RECOVERY_WINDOW: 120,
  MORNING: 90,
};

export function shouldRefreshSnapshotForPhaseDrift(
  snapshot: AthleteSnapshot,
  now: Date = new Date(),
): boolean {
  const phase = snapshot.dailyPhase?.phase;
  if (!phase) {
    return true;
  }

  const ageMin = minutesBetween(snapshot.generatedAt, now);
  const maxAge = PHASE_MAX_AGE_MINUTES[phase];
  if (maxAge !== undefined && ageMin >= maxAge) {
    return true;
  }

  return now.getHours() >= 22 && phase !== 'END_OF_DAY';
}
