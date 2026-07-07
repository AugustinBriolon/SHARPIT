import { PRE_SESSION_WINDOW_HOURS } from '@/lib/daily-phase/constants';
import { minutesBetween, parsePlannedStart } from '@/lib/daily-phase/day-context';
import type { DailyPhaseDayContext } from '@/lib/daily-phase/types';

export function isPreSessionWindow(
  dayContext: Pick<DailyPhaseDayContext, 'nextPlannedStartAt' | 'remainingPlannedCount'>,
  refDate: Date,
  trainingDay: Date,
): boolean {
  if (dayContext.remainingPlannedCount === 0) return false;

  if (dayContext.nextPlannedStartAt) {
    const start = new Date(dayContext.nextPlannedStartAt);
    const windowStart = new Date(start.getTime() - PRE_SESSION_WINDOW_HOURS * 3_600_000);
    const graceAfter = new Date(start.getTime() + 30 * 60_000);
    return refDate >= windowStart && refDate <= graceAfter;
  }

  // Planned without clock time — session becomes primary focus after midday.
  const hoursSinceMidnight =
    (refDate.getTime() - startOfTrainingDay(trainingDay).getTime()) / 3_600_000;
  return hoursSinceMidnight >= 12;
}

function startOfTrainingDay(trainingDay: Date): Date {
  const d = new Date(trainingDay);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isAccomplishmentWindow(
  minutesSinceLastActivity: number | null,
  newSessionSincePriorSnapshot: boolean,
): boolean {
  if (newSessionSincePriorSnapshot) return true;
  if (minutesSinceLastActivity == null) return false;
  return minutesSinceLastActivity < 60;
}

export function minutesSinceActivity(lastActivityAt: string | null, refDate: Date): number | null {
  if (!lastActivityAt) return null;
  return minutesBetween(lastActivityAt, refDate);
}

export { parsePlannedStart };
