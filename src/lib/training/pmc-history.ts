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

/** A session's Training Stress as computed by the Core's tiered cascade. */
export interface CoreSessionTss {
  /** `YYYY-MM-DD`. */
  trainingDayId: string;
  tssScore: number;
}

/**
 * Daily TSS, preferring the Core's tiered cascade over the per-activity estimate.
 *
 * The Core derives TSS from power, then heart rate, then pace, then session RPE,
 * then duration, tagging which method it used. `activity-load.ts` only ever has
 * the last of those, and `Activity.load` additionally mixes Garmin's TSS with its
 * EPOC training load for rows written before that was separated. Measured here,
 * the legacy path put runs at 151 TSS/h against the Core's 56.
 *
 * A day switches to the Core only when its session count matches the day's
 * activity count exactly. Two failure modes make anything looser unsafe:
 *
 * - Fewer sessions than activities means partial coverage, and blending a Core
 *   score with a legacy estimate inside one day mixes two scales.
 * - More sessions than activities is ambiguous. It can be a legitimate multisport
 *   split, but it is also what a duplicated observation looks like, and the
 *   feature payload carries no session identity to deduplicate on. Summing them
 *   double-counts the day: on this database five recent days had a surplus
 *   session, which inflated ATL by about a third.
 *
 * Either way the day falls back wholesale, which is at least one consistent scale.
 */
function countActivitiesByDay(
  activities: readonly ActivityForAnalytics[],
): Map<string, number> {
  const activityCountByDay = new Map<string, number>();
  for (const activity of activities) {
    const key = toTrainingDayId(activity.date);
    activityCountByDay.set(key, (activityCountByDay.get(key) ?? 0) + 1);
  }
  return activityCountByDay;
}

function sumCoreSessionsByDay(
  coreSessions: readonly CoreSessionTss[],
): { coreTssByDay: Map<string, number>; coreCountByDay: Map<string, number> } {
  const coreTssByDay = new Map<string, number>();
  const coreCountByDay = new Map<string, number>();
  for (const session of coreSessions) {
    if (!Number.isFinite(session.tssScore)) {
      continue;
    }
    const key = session.trainingDayId;
    coreTssByDay.set(key, (coreTssByDay.get(key) ?? 0) + session.tssScore);
    coreCountByDay.set(key, (coreCountByDay.get(key) ?? 0) + 1);
  }
  return { coreTssByDay, coreCountByDay };
}

export function aggregateDailyTssPreferringCore(
  activities: readonly ActivityForAnalytics[],
  coreSessions: readonly CoreSessionTss[],
): Map<string, number> {
  const activityCountByDay = countActivitiesByDay(activities);
  const { coreTssByDay, coreCountByDay } = sumCoreSessionsByDay(coreSessions);
  const dailyTss = new Map(aggregateDailyTss(activities));

  for (const [day, coreTss] of coreTssByDay) {
    if (coreCountByDay.get(day) === activityCountByDay.get(day)) {
      dailyTss.set(day, coreTss);
    }
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
  /**
   * Core-computed session TSS. When supplied, days the Core fully covers use it
   * instead of the per-activity estimate.
   */
  coreSessions?: readonly CoreSessionTss[];
}

/**
 * Computes the athlete's PMC series across their whole recorded history.
 *
 * Returns full-precision values. Rest days between activities are included, so
 * the series is continuous and CTL decays across gaps.
 */
function resolveDailyTss(
  activities: readonly ActivityForAnalytics[],
  coreSessions: readonly CoreSessionTss[] | undefined,
): Map<string, number> {
  return coreSessions
    ? aggregateDailyTssPreferringCore(activities, coreSessions)
    : aggregateDailyTss(activities);
}

export function computeAthletePmc(
  activities: readonly ActivityForAnalytics[],
  options?: ComputeAthletePmcOptions,
): PmcDayPoint[] {
  const to = startOfDay(options?.refDate ?? new Date());
  const dailyTss = resolveDailyTss(activities, options?.coreSessions);
  const from = options?.from ? startOfDay(options.from) : earliestDay(activities);
  if (!from) {
    return [];
  }

  return runPmc({ from, to, dailyTss, initial: options?.initial });
}

function earliestDay(activities: readonly ActivityForAnalytics[]): Date | null {
  let earliest: Date | null = null;
  for (const activity of activities) {
    const day = startOfDay(activity.date);
    if (!earliest || day < earliest) {
      earliest = day;
    }
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
