import { differenceInCalendarDays } from 'date-fns';
import type { ClientGoal } from '@/lib/query/types';
import type { ThreadWeek } from '@/lib/training/thread/thread-model';

/** A step of zero is a held week, not a rise — say so rather than printing "+0". */
export function signOf(step: number): string {
  if (step > 0) {
    return '+';
  }
  if (step < 0) {
    return '−';
  }
  return '±';
}

export function buildGoalCountdown(targetDate: Date | string): string {
  const days = differenceInCalendarDays(new Date(targetDate), new Date());
  if (days === 0) {
    return 'Aujourd’hui';
  }
  return days > 0 ? `J-${days}` : `J+${Math.abs(days)}`;
}

export function computeGoalBannerLoad(currentWeek: ThreadWeek | null): number | null {
  return currentWeek?.doneLoadKnown ? currentWeek.doneLoad : null;
}

export function computeGoalBannerStep({
  done,
  previousWeek,
}: {
  done: number | null;
  previousWeek: ThreadWeek | null;
}): number | null {
  const previousDone = previousWeek?.doneLoad ?? 0;
  if (done === null || previousDone <= 0) {
    return null;
  }
  return Math.round(((done - previousDone) / previousDone) * 100);
}

export function buildGoalBannerFigures({
  currentWeek,
  previousWeek,
}: {
  currentWeek: ThreadWeek | null;
  previousWeek: ThreadWeek | null;
}) {
  const done = computeGoalBannerLoad(currentWeek);
  const planned = currentWeek?.plannedLoad ?? null;
  const step = computeGoalBannerStep({ done, previousWeek });
  return { done, planned, step };
}

export function shouldShowGoalBanner({
  goal,
  coachLine,
  done,
}: {
  goal: ClientGoal | null;
  coachLine: { text: string } | null;
  done: number | null;
}): boolean {
  return Boolean(goal || coachLine || done !== null);
}
