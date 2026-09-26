import { format, isSameDay } from 'date-fns';

export type PlanningDaySelectionInput = {
  date: Date;
  planned: ReadonlyArray<{ completed: boolean }>;
  activities: ReadonlyArray<unknown>;
};

export type PlanningDayStripMark = 'empty' | 'planned' | 'done' | 'mixed';

export function planningDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function dayHasContent(day: PlanningDaySelectionInput): boolean {
  return day.planned.length > 0 || day.activities.length > 0;
}

/**
 * Pick which day the semaine strip focuses.
 * Order: preferred (if in week) → today (if in week) → first day with content → week start.
 */
export function resolveSelectedPlanningDayId(
  days: ReadonlyArray<PlanningDaySelectionInput>,
  options: { today: Date; preferredDayId?: string | null },
): string {
  if (days.length === 0) {
    return planningDayKey(options.today);
  }

  const ids = new Set(days.map((day) => planningDayKey(day.date)));
  const preferred = options.preferredDayId;
  if (preferred && ids.has(preferred)) {
    return preferred;
  }

  const todayId = planningDayKey(options.today);
  if (ids.has(todayId)) {
    return todayId;
  }

  const withContent = days.find(dayHasContent);
  if (withContent) {
    return planningDayKey(withContent.date);
  }

  return planningDayKey(days[0]!.date);
}

export function findPlanningDayById<T extends { date: Date }>(
  days: ReadonlyArray<T>,
  dayId: string,
): T | undefined {
  return days.find((day) => planningDayKey(day.date) === dayId);
}

export function planningDayStripMark(day: PlanningDaySelectionInput): PlanningDayStripMark {
  const openPlanned = day.planned.filter((session) => !session.completed).length;
  const done = day.planned.filter((session) => session.completed).length + day.activities.length;

  if (openPlanned > 0 && done > 0) {
    return 'mixed';
  }
  if (done > 0) {
    return 'done';
  }
  if (openPlanned > 0) {
    return 'planned';
  }
  return 'empty';
}

export function isPlanningDayToday(date: Date, today: Date): boolean {
  return isSameDay(date, today);
}
