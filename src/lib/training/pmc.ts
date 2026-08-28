import { eachDayOfInterval, format, startOfDay, subDays } from 'date-fns';

/**
 * PMC (Performance Management Chart) — the CTL/ATL exponential recurrence.
 *
 * Single source of truth for the recurrence and its time constants. This module
 * knows nothing about activities or load estimation: callers aggregate daily TSS
 * and hand it over.
 *
 * Two invariants this module exists to protect:
 *
 * 1. A display window is never a computation boundary. Seeding the recurrence at
 *    the start of a rolling window makes the result a function of the window
 *    length, because convergence is `1 - e^(-days/tau)`. A 28-day window reaches
 *    49% of steady-state CTL, a 90-day window 88%. Callers pass the athlete's
 *    whole history and slice afterwards for display.
 * 2. Precision is kept in full here. Rounding inside the recurrence compounds,
 *    because each day's output feeds the next day's input.
 *
 * @see docs/adr/ADR-001-pmc-time-constants.md — why tau is 42/7
 * @see docs/adr/ADR-011-pmc-state-and-window-semantics.md — why history is whole
 */

/** Chronic Training Load time constant, in days (Coggan 2003). */
export const PMC_CTL_TAU = 42;

/** Acute Training Load time constant, in days (Coggan 2003). */
export const PMC_ATL_TAU = 7;

export interface PmcState {
  ctl: number;
  atl: number;
}

/**
 * The athlete's state before their first recorded day.
 *
 * This is the one legitimate zero seed: an athlete with no history has no
 * measurable chronic load. ADR-001 accepts that this underrepresents a returning
 * athlete's true fitness. It is not licence to reseed mid-history.
 */
export const PMC_COLD_START: PmcState = { ctl: 0, atl: 0 };

export interface PmcDayPoint extends PmcState {
  /** Training day, `YYYY-MM-DD`. */
  date: string;
  tss: number;
}

/** Advances the state by one day. */
export function stepPmc(state: PmcState, tss: number): PmcState {
  return {
    ctl: state.ctl + (tss - state.ctl) / PMC_CTL_TAU,
    atl: state.atl + (tss - state.atl) / PMC_ATL_TAU,
  };
}

/** Training Stress Balance. Derived, never stored. */
export function pmcTsb(state: PmcState): number {
  return state.ctl - state.atl;
}

export function toTrainingDayId(date: Date): string {
  return format(startOfDay(date), 'yyyy-MM-dd');
}

export interface RunPmcParams {
  /** First day to emit. Must be the athlete's first recorded day unless `initial` carries prior state. */
  from: Date;
  to: Date;
  /** Daily TSS keyed by `YYYY-MM-DD`. Missing days count as rest. */
  dailyTss: ReadonlyMap<string, number>;
  /**
   * State on the day before `from`. Defaults to the cold start.
   *
   * Passing the persisted state of the preceding day makes an incremental run
   * exactly equal to a full-history run — the recurrence is pure, so resuming
   * from a known day is not an approximation.
   */
  initial?: PmcState;
}

/** Runs the recurrence day by day across the whole range, rest days included. */
export function runPmc({
  from,
  to,
  dailyTss,
  initial = PMC_COLD_START,
}: RunPmcParams): PmcDayPoint[] {
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (start > end) {
    return [];
  }

  let state = initial;

  return eachDayOfInterval({ start, end }).map((day) => {
    const date = toTrainingDayId(day);
    const tss = dailyTss.get(date) ?? 0;
    state = stepPmc(state, tss);
    return { date, tss, ...state };
  });
}

/**
 * Trims a computed series to the last `days` for display.
 *
 * Purely a presentation concern: the values are unchanged, only fewer of them.
 * This is the only place a window may be applied.
 */
export function slicePmcWindow<T extends { date: string }>(
  series: readonly T[],
  days: number,
  refDate?: Date,
): T[] {
  const end = refDate ? startOfDay(refDate) : undefined;
  const last = series.at(-1);
  const anchor = end ?? (last ? startOfDay(new Date(`${last.date}T12:00:00.000Z`)) : null);
  if (!anchor) {
    return [];
  }

  const cutoff = toTrainingDayId(subDays(anchor, days));
  return series.filter((point) => point.date >= cutoff);
}
