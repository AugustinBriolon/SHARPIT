import { endOfWeek, format, startOfWeek, subWeeks } from 'date-fns';

const WEEK_OPTS = { weekStartsOn: 1 as const };

/** Structural subset of CalendarDay — keeps the helpers pure and testable. */
export type WeekStripDay = {
  date: Date;
  activities: { id: string; load: number | null }[];
  planned: { activityId: string | null; intensity: unknown }[];
};

// ---------------------------------------------------------------------------
// Week cells — one cell per week (previous weeks + current), planning-oriented
// ---------------------------------------------------------------------------

export type WeekCell = {
  weekStart: Date;
  isCurrent: boolean;
  doneCount: number;
  plannedCount: number;
};

/**
 * Build the strip cells: `count` weeks ending on the current one (oldest
 * first). Each cell aggregates realized activities and planned sessions.
 */
export function buildWeekCells(
  activities: { date: Date | string }[],
  planned: { date: Date | string }[],
  today: Date,
  count = 7,
): WeekCell[] {
  const currentStart = startOfWeek(today, WEEK_OPTS);
  const cells: WeekCell[] = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const weekStart = subWeeks(currentStart, i);
    const from = weekStart.getTime();
    const to = endOfWeek(weekStart, WEEK_OPTS).getTime();
    const inWeek = (date: Date | string) => {
      const time = new Date(date).getTime();
      return time >= from && time <= to;
    };

    cells.push({
      weekStart,
      isCurrent: i === 0,
      doneCount: activities.filter((activity) => inWeek(activity.date)).length,
      plannedCount: planned.filter((session) => inWeek(session.date)).length,
    });
  }

  return cells;
}

export type WeekCellKind = 'done' | 'planned' | 'empty';

/**
 * What the cell displays: realized count first (green), else planned count
 * (neutral) — « nb d'activités réalisées ou prévues selon le code couleur ».
 */
export function weekCellReading(cell: WeekCell): { count: number; kind: WeekCellKind } {
  if (cell.doneCount > 0) return { count: cell.doneCount, kind: 'done' };
  if (cell.plannedCount > 0) return { count: cell.plannedCount, kind: 'planned' };
  return { count: 0, kind: 'empty' };
}

export function weekCellAccent(kind: WeekCellKind): string | null {
  switch (kind) {
    case 'done':
      return 'var(--color-signal-base)';
    case 'planned':
      return 'var(--color-signal-neutral)';
    case 'empty':
      return null;
  }
}

/** Each cell opens the planning framed on its week. */
export function weekCellHref(cell: WeekCell): string {
  return `/training/planning?week=${format(cell.weekStart, 'yyyy-MM-dd')}`;
}

// ---------------------------------------------------------------------------
// Current-week summary — header label
// ---------------------------------------------------------------------------

export type WeekSummary = {
  doneCount: number;
  plannedCount: number;
  weekLoad: number;
};

export function buildWeekSummary(days: WeekStripDay[]): WeekSummary {
  let doneCount = 0;
  let plannedCount = 0;
  let weekLoad = 0;

  for (const day of days) {
    doneCount += day.activities.length;
    plannedCount += day.planned.length;
    for (const activity of day.activities) {
      if (activity.load != null) weekLoad += activity.load;
    }
  }

  return { doneCount, plannedCount, weekLoad: Math.round(weekLoad) };
}

/** « 3/5 séances · 240 TSS » — null when the week is fully empty. */
export function weekSummaryLabel(summary: WeekSummary): string | null {
  const parts: string[] = [];

  if (summary.plannedCount > 0) {
    const plural = summary.plannedCount > 1 ? 'séances' : 'séance';
    parts.push(`${summary.doneCount}/${summary.plannedCount} ${plural}`);
  } else if (summary.doneCount > 0) {
    const plural = summary.doneCount > 1 ? 'séances' : 'séance';
    parts.push(`${summary.doneCount} ${plural}`);
  }

  if (summary.weekLoad > 0) {
    parts.push(`${summary.weekLoad} TSS`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}
