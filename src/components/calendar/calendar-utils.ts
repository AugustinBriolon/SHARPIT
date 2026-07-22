import { intensityOrder } from '@/lib/planned-session/sessions';
import type { CalendarDay } from '@/lib/calendar';
import type { GoogleCalendarEvent } from '@/lib/query/fetchers';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DayEvent } from './calendar-types';

export function getDayCellDateClassName(isToday: boolean, inMonth: boolean): string {
  if (isToday) {
    return 'bg-primary/12 text-primary ring-primary/20 flex size-6 items-center justify-center rounded-full font-semibold ring-1';
  }
  if (inMonth) {
    return 'text-foreground';
  }
  return 'text-muted-foreground/50';
}

export function getCalendarDayLoad(cell: CalendarDay): number | null {
  const activityLoad = getCalendarDayActivityLoad(cell);
  if (activityLoad > 0) return Math.round(activityLoad);

  const plannedIntensityIndex = cell.planned.reduce((maxIndex, session) => {
    if (!session.intensity) return maxIndex;
    return Math.max(maxIndex, intensityOrder.indexOf(session.intensity) + 1);
  }, 0);
  if (plannedIntensityIndex > 0) {
    return Math.round((plannedIntensityIndex / intensityOrder.length) * 100);
  }
  return null;
}

function getCalendarDayActivityLoad(cell: CalendarDay): number {
  return cell.activities.reduce((sum, activity) => sum + Math.max(0, activity.load ?? 0), 0);
}

export function getCalendarDayBorderAccent(cell: CalendarDay): string | null {
  const activityLoad = getCalendarDayActivityLoad(cell);
  if (activityLoad <= 0) {
    return null;
  }
  if (activityLoad < 25) return 'var(--color-chart-1)';
  if (activityLoad < 55) return 'var(--color-chart-2)';
  if (activityLoad < 90) return 'var(--color-chart-3)';
  if (activityLoad < 130) return 'var(--color-chart-4)';
  return 'var(--color-chart-5)';
}

export function getCalendarDaySignalLabel(cell: CalendarDay): string {
  const activityLoad = getCalendarDayActivityLoad(cell);
  if (activityLoad > 0) {
    return `${Math.round(activityLoad)} TSS`;
  }
  const plannedCount = cell.planned.length;
  if (plannedCount > 0) {
    return `${plannedCount} planifiée${plannedCount > 1 ? 's' : ''}`;
  }
  return 'repos';
}

export function calendarToolbarTitle(
  isMobile: boolean,
  mounted: boolean,
  gridStart: Date,
  gridEnd: Date,
  month: Date,
): string {
  if (isMobile) {
    return `${format(gridStart, 'd MMM', { locale: fr })} – ${format(gridEnd, 'd MMM yyyy', { locale: fr })}`;
  }
  if (mounted) {
    return format(month, 'MMMM yyyy', { locale: fr });
  }
  return 'Calendrier';
}

/**
 * Regroupe les événements Google par jour "yyyy-MM-dd", en dépliant les
 * événements multi-jours sur chacun des jours qu'ils couvrent.
 */
export function groupEventsByDay(events: GoogleCalendarEvent[]): Record<string, DayEvent[]> {
  const map: Record<string, DayEvent[]> = {};

  for (const e of events) {
    const startKey = e.allDay ? e.start.slice(0, 10) : format(new Date(e.start), 'yyyy-MM-dd');

    let endKey: string;
    if (e.allDay) {
      const end = new Date(`${e.end.slice(0, 10)}T00:00:00`);
      end.setDate(end.getDate() - 1);
      endKey = format(end, 'yyyy-MM-dd');
    } else {
      endKey = format(new Date(e.end), 'yyyy-MM-dd');
    }
    if (endKey < startKey) endKey = startKey;

    const cursor = new Date(`${startKey}T00:00:00`);
    const last = new Date(`${endKey}T00:00:00`);
    let guard = 0;
    while (cursor <= last && guard < 60) {
      const key = format(cursor, 'yyyy-MM-dd');
      (map[key] ??= []).push({
        event: e,
        isStart: key === startKey,
        isEnd: key === endKey,
      });
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
  }

  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => {
      if (a.event.allDay !== b.event.allDay) return a.event.allDay ? -1 : 1;
      return a.event.start.localeCompare(b.event.start);
    });
  }
  return map;
}

// Variable module pour le drag natif (dataTransfer indisponible pendant dragOver).
let dragSessionId: string | null = null;

export function setDragSessionId(id: string | null): void {
  dragSessionId = id;
}

export function getDragSessionId(): string | null {
  return dragSessionId;
}
