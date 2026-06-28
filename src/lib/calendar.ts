import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { ClientActivity, ClientPlannedSession } from "@/lib/client/types";

export interface CalendarDay {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  activities: ClientActivity[];
  planned: ClientPlannedSession[];
}

const WEEK_OPTS = { weekStartsOn: 1 as const };

export const weekDayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/**
 * Construit la grille du mois (semaines de 7 jours, du lundi au dimanche)
 * en y rattachant activités réalisées et séances planifiées.
 */
export function buildCalendarMonth(
  month: Date,
  activities: ClientActivity[],
  planned: ClientPlannedSession[],
): CalendarDay[][] {
  const gridStart = startOfWeek(startOfMonth(month), WEEK_OPTS);
  const gridEnd = endOfWeek(endOfMonth(month), WEEK_OPTS);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();
  const monthIndex = month.getMonth();

  const cells: CalendarDay[] = days.map((date) => ({
    date,
    inMonth: date.getMonth() === monthIndex,
    isToday: isSameDay(date, today),
    activities: activities.filter((a) => isSameDay(new Date(a.date), date)),
    planned: planned.filter((p) => isSameDay(new Date(p.date), date)),
  }));

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
