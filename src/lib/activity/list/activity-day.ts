import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/** Local calendar-day equality (athlete timezone / browser locale). */
export function isActivityToday(date: Date, now: Date = new Date()): boolean {
  const today = format(now, 'yyyy-MM-dd', { locale: fr });
  return format(date, 'yyyy-MM-dd', { locale: fr }) === today;
}
