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

export interface ProgramWeek {
  weekStart: string;
  sessionCount: number;
  isCurrent: boolean;
}

export interface ActivityConsistencyStats {
  cells: HeatmapCell[];
  weekColumns: HeatmapCell[][];
  currentStreak: number;
  activeThisWeek: boolean;
  thisWeekSessionCount: number;
  programWeeks: ProgramWeek[];
  heldWeeks: number;
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
/** Fixed week strip length in the regularity panel (visual only). */
export const PROGRAM_WEEK_COUNT = 8;
/**
 * A full training week on the regularity strip: one session a day.
 * Heights are linear against this floor (or a higher peak in the window),
 * so 4 sessions and 7 sessions never share a bar.
 */
export const PROGRAM_WEEK_BAR_CEILING = 7;
const EMPTY_WEEK_BAR_PCT = 10;
const MIN_FILLED_WEEK_BAR_PCT = 14;

/** Bar height 0–100. Empty weeks stay a stub; filled weeks scale with count. */
export function programWeekBarPct(sessionCount: number, windowPeak: number): number {
  if (sessionCount <= 0) {
    return EMPTY_WEEK_BAR_PCT;
  }
  const peak = Math.max(windowPeak, PROGRAM_WEEK_BAR_CEILING, sessionCount);
  return Math.max(MIN_FILLED_WEEK_BAR_PCT, Math.round((sessionCount / peak) * 100));
}

function isoWeekKey(date: Date): string {
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`;
}

function loadToLevel(count: number, load: number): HeatmapLevel {
  if (count === 0) {
    return 0;
  }
  if (count >= 3 || load >= 200) {
    return 4;
  }
  if (count >= 2 || load >= 100) {
    return 3;
  }
  if (load >= 40) {
    return 2;
  }
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

  if (column.length > 0) {
    columns.push(column);
  }
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

export function buildProgramWeeks(
  activities: ActivityForConsistency[],
  refDate: Date = new Date(),
  weekCount: number = PROGRAM_WEEK_COUNT,
): ProgramWeek[] {
  const byWeek = new Map<string, number>();
  for (const activity of activities) {
    const start = startOfWeek(startOfDay(new Date(activity.date)), { weekStartsOn: 1 });
    const key = format(start, 'yyyy-MM-dd');
    byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
  }

  const refWeekStart = startOfWeek(startOfDay(refDate), { weekStartsOn: 1 });
  const weeks: ProgramWeek[] = [];
  for (let i = weekCount - 1; i >= 0; i -= 1) {
    const weekStart = subWeeks(refWeekStart, i);
    const key = format(weekStart, 'yyyy-MM-dd');
    weeks.push({
      weekStart: key,
      sessionCount: byWeek.get(key) ?? 0,
      isCurrent: i === 0,
    });
  }
  return weeks;
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
  const programWeeks = buildProgramWeeks(activities, ref);
  const thisWeek = programWeeks[programWeeks.length - 1];

  return {
    cells,
    weekColumns: buildWeekColumns(cells),
    currentStreak,
    activeThisWeek,
    thisWeekSessionCount: thisWeek?.sessionCount ?? 0,
    programWeeks,
    /** Streak length — not the count of filled bars in the 8-week strip. */
    heldWeeks: currentStreak,
    trailingYearActivityCount,
    activeDays: inRangeCells.filter((c) => c.count > 0).length,
    heatmapDays,
  };
}

export function formatHeatmapRangeLabel(days: number): string {
  if (days >= 360) {
    return '12 mois';
  }
  const weeks = Math.round(days / 7);
  return weeks === 1 ? '1 semaine' : `${weeks} semaines`;
}

/**
 * Five steps that are actually five steps.
 *
 * The old ramp went 25 / 45 / 70 / 100 % alpha of one colour, which on a pale
 * canvas is four barely separable washes — the grid read as one flat texture.
 * The gaps are widened at the light end, where the eye separates least, and the
 * empty cell gets a faint outline so a rest day reads as a day rather than as
 * nothing at all.
 */
export const HEATMAP_LEVEL_CLASS: Record<HeatmapLevel, string> = {
  0: 'bg-analysis-surface-alt ring-analysis-border/40 ring-1 ring-inset dark:bg-analysis-surface',
  1: 'bg-primary/20 dark:bg-primary/18',
  2: 'bg-primary/45 dark:bg-primary/38',
  3: 'bg-primary/72 dark:bg-primary/62',
  4: 'bg-primary dark:bg-primary/90',
};
