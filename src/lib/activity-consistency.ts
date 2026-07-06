import {
  eachDayOfInterval,
  endOfWeek,
  format,
  getISOWeek,
  getISOWeekYear,
  getISODay,
  isSameISOWeek,
  startOfDay,
  startOfWeek,
  subDays,
  subWeeks,
} from 'date-fns';

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatmapCell {
  date: string;
  count: number;
  load: number;
  level: HeatmapLevel;
  inRange: boolean;
}

export interface ActivityConsistencyStats {
  cells: HeatmapCell[];
  weekColumns: HeatmapCell[][];
  currentStreak: number;
  activeThisWeek: boolean;
  trailingYearActivityCount: number;
  activeDays: number;
  heatmapDays: number;
}

export interface ActivityForConsistency {
  date: Date | string;
  load?: number | null;
}

const HEATMAP_DAYS = 365;
export const HEATMAP_DAYS_MOBILE = 184;

function isoWeekKey(date: Date): string {
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`;
}

function loadToLevel(count: number, load: number): HeatmapLevel {
  if (count === 0) return 0;
  if (count >= 3 || load >= 200) return 4;
  if (count >= 2 || load >= 100) return 3;
  if (load >= 40) return 2;
  return 1;
}

function aggregateByDay(
  activities: ActivityForConsistency[],
): Map<string, { count: number; load: number }> {
  const map = new Map<string, { count: number; load: number }>();
  for (const activity of activities) {
    const key = format(startOfDay(new Date(activity.date)), 'yyyy-MM-dd');
    const prev = map.get(key) ?? { count: 0, load: 0 };
    map.set(key, {
      count: prev.count + 1,
      load: prev.load + (activity.load ?? 0),
    });
  }
  return map;
}

function buildWeekColumns(cells: HeatmapCell[]): HeatmapCell[][] {
  const columns: HeatmapCell[][] = [];
  let column: HeatmapCell[] = [];

  for (const cell of cells) {
    const day = new Date(`${cell.date}T12:00:00`);
    if (column.length > 0 && getISODay(day) === 1) {
      columns.push(column);
      column = [];
    }
    column.push(cell);
  }

  if (column.length > 0) columns.push(column);
  return columns;
}

/**
 * Série hebdomadaire type Strava : au moins 1 séance par semaine ISO.
 * La semaine en cours sans séance ne casse pas encore la série.
 */
export function computeWeeklyActivityStreak(
  activities: ActivityForConsistency[],
  refDate: Date = new Date(),
): { currentStreak: number; activeThisWeek: boolean } {
  const weeksWithActivity = new Set<string>();
  for (const activity of activities) {
    weeksWithActivity.add(isoWeekKey(startOfDay(new Date(activity.date))));
  }

  const ref = startOfDay(refDate);
  const currentKey = isoWeekKey(ref);
  const activeThisWeek = weeksWithActivity.has(currentKey);

  let streak = 0;
  let cursor = startOfWeek(ref, { weekStartsOn: 1 });
  let skippedCurrentWeek = false;

  for (let guard = 0; guard < 120; guard += 1) {
    const key = isoWeekKey(cursor);
    const isCurrentWeek = isSameISOWeek(cursor, ref);

    if (weeksWithActivity.has(key)) {
      streak += 1;
      cursor = subWeeks(cursor, 1);
      continue;
    }

    if (isCurrentWeek && !skippedCurrentWeek) {
      skippedCurrentWeek = true;
      cursor = subWeeks(cursor, 1);
      continue;
    }

    break;
  }

  return { currentStreak: streak, activeThisWeek };
}

export function buildActivityConsistencyStats(
  activities: ActivityForConsistency[],
  refDate: Date = new Date(),
  options?: { heatmapDays?: number },
): ActivityConsistencyStats {
  const heatmapDays = options?.heatmapDays ?? HEATMAP_DAYS;
  const ref = startOfDay(refDate);
  const rangeStart = subDays(ref, heatmapDays - 1);
  const gridStart = startOfWeek(rangeStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(ref, { weekStartsOn: 1 });

  const byDay = aggregateByDay(activities);

  const cells: HeatmapCell[] = eachDayOfInterval({ start: gridStart, end: gridEnd }).map((day) => {
    const date = format(day, 'yyyy-MM-dd');
    const stats = byDay.get(date) ?? { count: 0, load: 0 };
    const inRange = day >= rangeStart && day <= ref;
    return {
      date,
      count: stats.count,
      load: Math.round(stats.load),
      level: inRange ? loadToLevel(stats.count, stats.load) : 0,
      inRange,
    };
  });

  const inRangeCells = cells.filter((c) => c.inRange);
  const trailingYearActivityCount = activities.filter((a) => {
    const date = startOfDay(new Date(a.date));
    return date >= rangeStart && date <= ref;
  }).length;
  const { currentStreak, activeThisWeek } = computeWeeklyActivityStreak(activities, ref);

  return {
    cells,
    weekColumns: buildWeekColumns(cells),
    currentStreak,
    activeThisWeek,
    trailingYearActivityCount,
    activeDays: inRangeCells.filter((c) => c.count > 0).length,
    heatmapDays,
  };
}

export function formatHeatmapRangeLabel(days: number): string {
  if (days >= 360) return '12 mois';
  const weeks = Math.round(days / 7);
  return weeks === 1 ? '1 semaine' : `${weeks} semaines`;
}

export const HEATMAP_LEVEL_CLASS: Record<HeatmapLevel, string> = {
  0: 'bg-neutral-100 dark:bg-neutral-800/80',
  1: 'bg-emerald-200/90 dark:bg-emerald-900/70',
  2: 'bg-emerald-400/85 dark:bg-emerald-700/80',
  3: 'bg-emerald-600/90 dark:bg-emerald-500/75',
  4: 'bg-emerald-700 dark:bg-emerald-400/90',
};
