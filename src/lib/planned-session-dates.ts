import { differenceInCalendarDays, format, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ClientPlannedSession } from '@/lib/query/types';

type PlannedSessionLike = Pick<ClientPlannedSession, 'date' | 'completed' | 'activityId'>;

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
): T[] {
  return sessions
    .filter((s) => isUpcomingPlannedSession(s, ref))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
