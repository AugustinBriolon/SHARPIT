import type { DailyPhaseDayContext, DailyPhaseSessionStatus } from '@/lib/daily-phase/types';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { format, isSameDay, startOfDay } from 'date-fns';
import {
  comparePlannedSessionsBySchedule,
  parsePlannedStart,
} from '@/lib/planned-session/planned-session-dates';
import { activityMatchesTrainingDay } from '@/lib/training/periodization/training-day';

export { parsePlannedStart } from '@/lib/planned-session/planned-session-dates';

function deriveSessionStatus(
  completedCount: number,
  remainingPlanned: number,
): DailyPhaseSessionStatus {
  if (completedCount === 0 && remainingPlanned === 0) {
    return 'NONE_TODAY';
  }
  if (completedCount === 0 && remainingPlanned > 0) {
    return 'PLANNED_ONLY';
  }
  if (completedCount > 0 && remainingPlanned > 0) {
    return 'COMPLETED_WITH_REMAINING';
  }
  return 'COMPLETED_ONLY';
}

export function buildDailyPhaseDayContext(
  refDate: Date,
  activities: ClientActivity[],
  plannedSessions: ClientPlannedSession[],
  options?: { trainingDayId?: string },
): DailyPhaseDayContext {
  const refDay = startOfDay(refDate);
  const resolvedTrainingDayId = options?.trainingDayId ?? format(refDate, 'yyyy-MM-dd');

  const todayActivities = activities
    .filter((a) =>
      options?.trainingDayId
        ? activityMatchesTrainingDay(a.date, resolvedTrainingDayId)
        : isSameDay(new Date(a.date), refDay),
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const remainingPlanned = plannedSessions
    .filter(
      (s) =>
        format(new Date(s.date), 'yyyy-MM-dd') === resolvedTrainingDayId &&
        !s.completed &&
        !s.activityId,
    )
    .sort(comparePlannedSessionsBySchedule);

  const plannedToday = plannedSessions.filter(
    (s) => format(new Date(s.date), 'yyyy-MM-dd') === resolvedTrainingDayId,
  );
  const completedSessionCount = todayActivities.length;
  const remainingPlannedCount = remainingPlanned.length;

  const lastActivity = todayActivities.at(-1);
  const [nextPlanned] = remainingPlanned;

  return {
    sessionStatus: deriveSessionStatus(completedSessionCount, remainingPlannedCount),
    completedSessionCount,
    plannedSessionCount: plannedToday.length,
    remainingPlannedCount,
    lastActivityAt: lastActivity ? new Date(lastActivity.date).toISOString() : null,
    nextPlannedStartAt: nextPlanned
      ? (parsePlannedStart(refDay, nextPlanned.startTime)?.toISOString() ?? null)
      : null,
  };
}

export function minutesBetween(earlier: Date | string, later: Date): number {
  const start = earlier instanceof Date ? earlier.getTime() : new Date(earlier).getTime();
  return Math.max(0, Math.round((later.getTime() - start) / 60_000));
}
