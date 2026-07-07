import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import type { PhaseNarrative } from '@/lib/daily-phase/narrative';
import { buildPhaseNarrative } from '@/lib/daily-phase/narrative';
import { buildDailyPhaseDayContext, minutesBetween } from '@/lib/daily-phase/day-context';
import { resolveDailyPhase, isForwardAdvicePhase } from '@/lib/daily-phase/resolve';
import type { DailyPhaseResolution } from '@/lib/daily-phase/types';
import { buildTopActionLine } from '@/lib/today-rich-view';
import { buildTodayEffortSnapshot } from '@/lib/today-narrative-context';
import type { TodayState } from '@/hooks/use-today';
import type { OverallVerdict } from '@/lib/today-mapping';
import { isSameDay, startOfDay } from 'date-fns';

export type SnapshotActivityInput = {
  id: string;
  date: Date | string;
  type: string;
  load?: number | null;
  duration?: number | null;
  title?: string | null;
};

export type SnapshotPlannedSessionInput = {
  id: string;
  date: Date | string;
  type: string;
  startTime?: string | null;
  completed?: boolean;
  activityId?: string | null;
  title?: string | null;
};

export type SnapshotPhaseBuildParams = {
  refDate: Date;
  trainingDayId: string;
  todayState: TodayState;
  activities: SnapshotActivityInput[];
  plannedSessions: SnapshotPlannedSessionInput[];
  priorSnapshot: Pick<AthleteSnapshot, 'generatedAt' | 'dailyPhase'> | null;
  latestSessionObservationAt: Date | string | null;
  sleepLoggedTonight: boolean;
  adviceActionable: boolean;
};

function totalTssToday(activities: SnapshotActivityInput[], refDate: Date): number | null {
  const refDay = startOfDay(refDate);
  const today = activities.filter((a) => isSameDay(new Date(a.date), refDay));
  if (today.length === 0) return null;
  return Math.round(today.reduce((sum, a) => sum + (a.load ?? 0), 0));
}

export function buildSnapshotDailyPhase(params: SnapshotPhaseBuildParams): {
  dailyPhase: DailyPhaseResolution;
  phaseNarrative: PhaseNarrative;
} {
  const {
    refDate,
    todayState,
    activities,
    plannedSessions,
    priorSnapshot,
    latestSessionObservationAt,
    sleepLoggedTonight,
    adviceActionable,
  } = params;

  const dayContext = buildDailyPhaseDayContext(
    refDate,
    activities as never,
    plannedSessions as never,
  );

  const priorGeneratedAt = priorSnapshot?.generatedAt ?? null;
  const newSessionSincePriorSnapshot = Boolean(
    latestSessionObservationAt &&
    priorGeneratedAt &&
    new Date(latestSessionObservationAt).getTime() > new Date(priorGeneratedAt).getTime(),
  );

  const newInferenceSincePriorSnapshot = Boolean(
    todayState.reasoning?.computedAt &&
    priorGeneratedAt &&
    new Date(todayState.reasoning.computedAt).getTime() > new Date(priorGeneratedAt).getTime(),
  );

  const minutesSinceSnapshotGenerated = priorGeneratedAt
    ? minutesBetween(priorGeneratedAt, refDate)
    : null;

  const minutesSinceLastActivity = dayContext.lastActivityAt
    ? minutesBetween(dayContext.lastActivityAt, refDate)
    : null;

  const dailyStrainAvailable = Boolean(
    todayState.dailyStrain?.available && todayState.dailyStrain.strainScore != null,
  );

  const recommendationAvailable = Boolean(
    todayState.reasoning?.topAction ??
    todayState.recovery?.recommendation ??
    todayState.fatigue?.recommendation ??
    todayState.adaptation?.recommendation,
  );

  const resolution = resolveDailyPhase(
    {
      dayContext,
      athlete: {
        recommendationAvailable,
        adviceActionable,
        dailyStrainAvailable,
        newSessionSincePriorSnapshot,
        newInferenceSincePriorSnapshot,
        newObservationsSincePriorSnapshot: newSessionSincePriorSnapshot,
        minutesSinceLastActivity,
        minutesSinceSnapshotGenerated,
        priorPhase: priorSnapshot?.dailyPhase?.phase ?? null,
        sleepLoggedTonight,
      },
      localHour: refDate.getHours(),
    },
    refDate,
  );

  const effort = buildTodayEffortSnapshot(activities as never, refDate);
  const verdict = (todayState.reasoning?.overallVerdict ?? 'INSUFFICIENT_DATA') as OverallVerdict;
  const actionLine = isForwardAdvicePhase(resolution.phase)
    ? buildTopActionLine(todayState.reasoning?.topAction ?? null)
    : null;

  const phaseNarrative = buildPhaseNarrative({
    resolution,
    verdict,
    adviceActionable,
    actionLine,
    sportLabel: effort?.sportLabel ?? null,
    totalTssToday: totalTssToday(activities, refDate),
    dailyStrainScore: todayState.dailyStrain?.strainScore ?? null,
    dailyStrainAvailable,
  });

  return { dailyPhase: resolution, phaseNarrative };
}

function effortLevelLabel(level: 'high' | 'moderate' | 'light'): string {
  if (level === 'high') return 'chargée';
  if (level === 'moderate') return 'modérée';
  return 'légère';
}

export function buildPhasePrimaryProductMessage(
  phase: DailyPhaseResolution['phase'],
  phaseNarrative: PhaseNarrative,
  effort: ReturnType<typeof buildTodayEffortSnapshot>,
): string | null {
  switch (phase) {
    case 'SESSION_COMPLETED':
      return phaseNarrative.heroHeadline;
    case 'RECOVERY_WINDOW':
      return phaseNarrative.heroSubline;
    case 'END_OF_DAY':
      return effort
        ? `Journée ${effortLevelLabel(effort.level)} · ${effort.totalTss} TSS`
        : phaseNarrative.heroSubline;
    case 'BEFORE_SESSION':
      return phaseNarrative.heroHeadline;
    default:
      return null;
  }
}

export function shouldRefreshSnapshotForPhaseDrift(
  snapshot: AthleteSnapshot,
  now: Date = new Date(),
): boolean {
  const phase = snapshot.dailyPhase?.phase;
  if (!phase) return true;

  const hour = now.getHours();
  const ageMin = minutesBetween(snapshot.generatedAt, now);

  if (phase === 'SESSION_COMPLETED' && ageMin >= 55) return true;
  if (phase === 'RECOVERY_WINDOW' && ageMin >= 120) return true;
  if (phase === 'MORNING' && ageMin >= 90) return true;
  if (hour >= 22 && phase !== 'END_OF_DAY') return true;

  return false;
}
