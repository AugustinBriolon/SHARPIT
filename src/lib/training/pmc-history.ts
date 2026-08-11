import { format, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { estimateActivityLoad, type ActivityForAnalytics } from '@/lib/training/activity-load';
import {
  pmcTsb,
  runPmc,
  toTrainingDayId,
  type PmcDayPoint,
  type PmcState,
} from '@/lib/training/pmc';

/**
 * Bridges activities to the PMC recurrence.
 *
 * The rule this module enforces: the recurrence always starts at the athlete's
 * first recorded day, never at the start of a display window. Callers that want
 * a shorter chart pass the whole history here and slice the result with
 * `slicePmcWindow`.
 *
 * @see docs/adr/ADR-011-pmc-state-and-window-semantics.md
 */

/** Presentation shape: rounded, labelled, TSB materialised for charts. */
export interface PmcPoint {
  date: string;
  label: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
}

/** Sums estimated load per training day. */
export function aggregateDailyTss(
  activities: readonly ActivityForAnalytics[],
): Map<string, number> {
  const dailyTss = new Map<string, number>();
  for (const activity of activities) {
    const key = toTrainingDayId(activity.date);
    dailyTss.set(key, (dailyTss.get(key) ?? 0) + estimateActivityLoad(activity));
  }
  return dailyTss;
}

export interface ComputeAthletePmcOptions {
  /** Last day to emit. Defaults to today. Days after it are ignored. */
  refDate?: Date;
  /**
   * First day to emit. Defaults to the athlete's earliest activity.
   *
   * Only pass this together with `initial`, to resume from persisted state.
   * Passing it alone reintroduces the window-as-boundary defect.
   */
  from?: Date;
  /** State on the day before `from`. See `runPmc`. */
  initial?: PmcState;
}

/**
 * Computes the athlete's PMC series across their whole recorded history.
 *
 * Returns full-precision values. Rest days between activities are included, so
 * the series is continuous and CTL decays across gaps.
 */
export function computeAthletePmc(
  activities: readonly ActivityForAnalytics[],
  options?: ComputeAthletePmcOptions,
): PmcDayPoint[] {
  const to = startOfDay(options?.refDate ?? new Date());
  const dailyTss = aggregateDailyTss(activities);

  const from = options?.from ? startOfDay(options.from) : earliestDay(activities);
  if (!from) return [];

  return runPmc({ from, to, dailyTss, initial: options?.initial });
}

function earliestDay(activities: readonly ActivityForAnalytics[]): Date | null {
  let earliest: Date | null = null;
  for (const activity of activities) {
    const day = startOfDay(activity.date);
    if (!earliest || day < earliest) earliest = day;
  }
  return earliest;
}

/** Adapts the computed series to the chart contract. */
export function toPmcPoints(series: readonly PmcDayPoint[]): PmcPoint[] {
  return series.map((point) => ({
    date: point.date,
    label: format(new Date(`${point.date}T12:00:00.000Z`), 'd MMM', { locale: fr }),
    tss: point.tss,
    ctl: Math.round(point.ctl),
    atl: Math.round(point.atl),
    tsb: Math.round(pmcTsb(point)),
  }));
}
