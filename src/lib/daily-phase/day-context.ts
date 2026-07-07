import type { DailyPhaseDayContext, DailyPhaseSessionStatus } from '@/lib/daily-phase/types';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { isSameDay, startOfDay } from 'date-fns';

function deriveSessionStatus(
  completedCount: number,
  remainingPlanned: number,
): DailyPhaseSessionStatus {
  if (completedCount === 0 && remainingPlanned === 0) return 'NONE_TODAY';
  if (completedCount === 0 && remainingPlanned > 0) return 'PLANNED_ONLY';
  if (completedCount > 0 && remainingPlanned > 0) return 'COMPLETED_WITH_REMAINING';
  return 'COMPLETED_ONLY';
}

export function parsePlannedStart(
  trainingDay: Date,
  startTime: string | null | undefined,
): Date | null {
  if (!startTime?.trim()) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(startTime.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const d = startOfDay(trainingDay);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function buildDailyPhaseDayContext(
  refDate: Date,
  activities: ClientActivity[],
  plannedSessions: ClientPlannedSession[],
): DailyPhaseDayContext {
  const refDay = startOfDay(refDate);

  const todayActivities = activities
    .filter((a) => isSameDay(new Date(a.date), refDay))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const remainingPlanned = plannedSessions
    .filter((s) => isSameDay(new Date(s.date), refDay) && !s.completed && !s.activityId)
    .sort((a, b) => {
      const ta = parsePlannedStart(refDay, a.startTime)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const tb = parsePlannedStart(refDay, b.startTime)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });

  const plannedToday = plannedSessions.filter((s) => isSameDay(new Date(s.date), refDay));
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
