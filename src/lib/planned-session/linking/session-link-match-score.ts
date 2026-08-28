import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { isSet } from '@/lib/util/value';

/**
 * Auto-link only on the same calendar day.
 * Adjacent-day matching created false "planned" realizations for spontaneous sessions.
 */
export function scorePlannedActivityMatch(
  session: { date: Date; durationMin: number | null },
  activity: { date: Date; duration: number | null },
): number {
  const dayDiff = Math.abs(
    differenceInCalendarDays(startOfDay(session.date), startOfDay(activity.date)),
  );
  if (dayDiff !== 0) {
    return 0;
  }

  let score = 100;
  if (isSet(session.durationMin) && isSet(activity.duration) && activity.duration > 0) {
    const plannedSec = session.durationMin * 60;
    const ratio =
      Math.abs(plannedSec - activity.duration) / Math.max(plannedSec, activity.duration);
    if (ratio <= 0.15) {
      score += 25;
    } else if (ratio <= 0.3) {
      score += 10;
    }
  }
  return score;
}

function formatDayDeltaLabel(dayDiff: number): string {
  if (dayDiff === 1) {
    return 'J+1';
  }
  if (dayDiff === -1) {
    return 'J−1';
  }
  return `J${dayDiff > 0 ? '+' : ''}${dayDiff}`;
}

function formatSameDayDurationLabel(
  session: { durationMin: number | null },
  activity: { duration: number | null },
): string {
  if (
    session.durationMin === undefined ||
    session.durationMin === null ||
    activity.duration === undefined ||
    activity.duration === null ||
    activity.duration <= 0
  ) {
    return 'Même jour';
  }
  const plannedSec = session.durationMin * 60;
  const deltaMin = Math.round(Math.abs(plannedSec - activity.duration) / 60);
  if (deltaMin === 0) {
    return 'Même jour · durée identique';
  }
  return `Même jour · Δ ${deltaMin} min`;
}

/** Instrument label for the activity picker — date delta and duration gap, not opaque tiers. */
export function formatActivityMatchLabel(
  session: { date: Date; durationMin: number | null },
  activity: { date: Date; duration: number | null },
): string {
  const dayDiff = differenceInCalendarDays(startOfDay(activity.date), startOfDay(session.date));

  if (dayDiff !== 0) {
    return formatDayDeltaLabel(dayDiff);
  }

  return formatSameDayDurationLabel(session, activity);
}
