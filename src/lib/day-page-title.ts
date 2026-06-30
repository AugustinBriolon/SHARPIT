import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';

const FULL_DATE = (date: Date) => format(date, 'EEEE d MMMM yyyy', { locale: fr });

/** Titre + sous-titre de la page jour (évite la date en double). */
export function dayPageHeader(date: Date): { title: string; subtitle?: string } {
  if (isToday(date)) {
    return { title: "Aujourd'hui", subtitle: FULL_DATE(date) };
  }
  if (isYesterday(date)) {
    return { title: 'Hier', subtitle: FULL_DATE(date) };
  }
  if (isTomorrow(date)) {
    return { title: 'Demain', subtitle: FULL_DATE(date) };
  }
  return { title: FULL_DATE(date) };
}
