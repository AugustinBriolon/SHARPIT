import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  endOfWeek,
  format,
  startOfDay,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ClientPlannedSession } from '@/lib/query/types';

type PlannedSessionLike = Pick<ClientPlannedSession, 'date' | 'completed' | 'activityId'>;

const WEEK_OPTS = { weekStartsOn: 1 as const };

/** Séance non réalisée dont la date est aujourd'hui ou plus tard (comparaison calendaire). */
export function isUpcomingPlannedSession(
  session: PlannedSessionLike,
  ref: Date = new Date(),
): boolean {
  if (session.completed || session.activityId) return false;
  const sessionDay = startOfDay(new Date(session.date));
  const refDay = startOfDay(ref);
  return sessionDay.getTime() >= refDay.getTime();
}

export function filterUpcomingPlannedSessions<T extends PlannedSessionLike>(
  sessions: T[],
  ref: Date = new Date(),
  options?: { horizonDays?: number },
): T[] {
  const horizonDays = options?.horizonDays;
  const horizonEnd = horizonDays != null ? startOfDay(addDays(startOfDay(ref), horizonDays)) : null;

  return sessions
    .filter((s) => {
      if (!isUpcomingPlannedSession(s, ref)) return false;
      if (horizonEnd == null) return true;
      return startOfDay(new Date(s.date)).getTime() <= horizonEnd.getTime();
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Preview selection for "Prochaines séances": keeps chronological order but
 * always reserves slots for next week when sessions exist there — otherwise a
 * full remaining current week fills the limit and hides the week ahead.
 *
 * Small previews (limit < 4) stay strictly chronological so responsive
 * truncation keeps the nearest sessions (top of the desktop grid), not the
 * next-week reserve that sits on the second row.
 */
export function selectUpcomingPlannedPreview<T extends PlannedSessionLike>(
  sessions: T[],
  ref: Date = new Date(),
  limit = 4,
): T[] {
  const upcoming = filterUpcomingPlannedSessions(sessions, ref);
  if (upcoming.length <= limit) return upcoming;
  if (limit < 4) return upcoming.slice(0, limit);

  const thisWeekEnd = startOfDay(endOfWeek(ref, WEEK_OPTS));
  const nextWeekEnd = startOfDay(endOfWeek(addWeeks(ref, 1), WEEK_OPTS));

  const remainingThisWeek: T[] = [];
  const nextWeek: T[] = [];

  for (const session of upcoming) {
    const day = startOfDay(new Date(session.date)).getTime();
    if (day <= thisWeekEnd.getTime()) remainingThisWeek.push(session);
    else if (day <= nextWeekEnd.getTime()) nextWeek.push(session);
  }

  if (nextWeek.length === 0) {
    return upcoming.slice(0, limit);
  }

  const reservedForNextWeek = Math.min(nextWeek.length, Math.max(2, Math.ceil(limit / 2)));
  const thisWeekBudget = Math.max(0, limit - reservedForNextWeek);
  const fromThisWeek = remainingThisWeek.slice(0, thisWeekBudget);
  const fromNextWeek = nextWeek.slice(0, limit - fromThisWeek.length);
  const selected = [...fromThisWeek, ...fromNextWeek];

  if (selected.length < limit) {
    const selectedSet = new Set(selected);
    for (const session of upcoming) {
      if (selected.length >= limit) break;
      if (selectedSet.has(session)) continue;
      selected.push(session);
      selectedSet.add(session);
    }
  }

  return selected.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** Libellé relatif basé sur les jours calendaires (pas la durée horaire). */
export function formatPlannedSessionRelativeDay(
  sessionDate: Date | string,
  ref: Date = new Date(),
): string {
  const day = startOfDay(new Date(sessionDate));
  const today = startOfDay(ref);
  const diff = differenceInCalendarDays(day, today);

  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  if (diff < 7) return `dans ${diff} jours`;
  return format(day, 'EEEE d MMMM', { locale: fr });
}
