import type { ThreadWeek } from './thread-model';

/**
 * The load ruler: nine weeks of training as bars, and the handle used to move
 * through the thread.
 *
 * Past weeks are drawn from what was recorded, future weeks from what is planned.
 * The two are never added together and never share a fill — a week that has not
 * happened is an intention, and drawing it solid would make the plan look like
 * history.
 */

export type RulerBar = {
  readonly weekKey: string;
  readonly label: string;
  /** The figure this bar stands for: recorded load in the past, planned ahead. */
  readonly load: number;
  /** 0–1 against the tallest bar in the window. */
  readonly height: number;
  readonly state: 'past' | 'current' | 'future';
  /**
   * A past week whose sessions carried no load at all.
   *
   * Drawing it as a bar of zero says the athlete did nothing that week, when in
   * fact he trained and the load was never recorded. The two are opposite
   * readings and only one of them is true.
   */
  readonly unmeasured: boolean;
};

/** Nine weeks fit a phone without the bars becoming lines. */
export const RULER_WINDOW = 9;

export function buildLoadRuler(weeks: readonly ThreadWeek[], window = RULER_WINDOW): RulerBar[] {
  if (weeks.length === 0) return [];

  const currentIndex = weeks.findIndex((week) => week.isCurrent);
  const anchor = currentIndex >= 0 ? currentIndex : weeks.length - 1;

  // Keep the current week in view, with the rest of the window spread around it.
  const before = Math.floor((window - 1) / 2);
  let start = Math.max(0, anchor - before);
  if (start + window > weeks.length) start = Math.max(0, weeks.length - window);
  const slice = weeks.slice(start, start + window);

  const bars = slice.map((week) => {
    let state: RulerBar['state'] = 'past';
    if (week.isCurrent) state = 'current';
    else if (week.isFuture) state = 'future';
    const load = state === 'future' ? week.plannedLoad : week.doneLoad;
    return {
      weekKey: week.weekKey,
      label: week.label,
      load,
      height: 0,
      state,
      unmeasured: state !== 'future' && !week.doneLoadKnown && week.days.length > 0,
    };
  });

  const tallest = Math.max(...bars.map((bar) => bar.load), 0);
  if (tallest <= 0) return bars;
  return bars.map((bar) => ({ ...bar, height: bar.load / tallest }));
}

/** "S31 → S39" — the span the ruler currently covers. */
export function rulerRangeLabel(bars: readonly RulerBar[]): string | null {
  if (bars.length === 0) return null;
  const first = bars[0]?.label;
  const last = bars.at(-1)?.label;
  if (!first || !last) return null;
  return first === last ? first : `${first} → ${last}`;
}
