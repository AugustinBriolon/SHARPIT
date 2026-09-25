import { describe, expect, it } from 'vitest';
import {
  PMC_ATL_TAU,
  PMC_CTL_TAU,
  PMC_COLD_START,
  pmcTsb,
  runPmc,
  slicePmcWindow,
  stepPmc,
  toTrainingDayId,
  type PmcDayPoint,
} from './pmc';

const REF = new Date('2026-08-11T12:00:00.000Z');

/** Constant daily load: CTL and ATL both converge to the load itself. */
function constantHistory(days: number, tss: number, end = REF): ReadonlyMap<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const day = new Date(end);
    day.setUTCDate(day.getUTCDate() - i);
    map.set(toTrainingDayId(day), tss);
  }
  return map;
}

function daysBefore(n: number, end = REF): Date {
  const day = new Date(end);
  day.setUTCDate(day.getUTCDate() - n);
  return day;
}

describe('stepPmc', () => {
  it('applies the EWMA recurrence with the ADR-001 time constants', () => {
    const next = stepPmc({ ctl: 0, atl: 0 }, 100);
    expect(next.ctl).toBeCloseTo(100 / PMC_CTL_TAU, 10);
    expect(next.atl).toBeCloseTo(100 / PMC_ATL_TAU, 10);
  });

  it('keeps full precision so the recurrence does not accumulate rounding error', () => {
    // Each day's output is the next day's input. Rounding here compounds, so a
    // single step must not be pre-rounded.
    const next = stepPmc({ ctl: 0, atl: 0 }, 1);
    expect(next.ctl).not.toBe(0);
    expect(next.ctl).toBeCloseTo(1 / 42, 10);
  });

  it('decays towards zero on a rest day', () => {
    const next = stepPmc({ ctl: 42, atl: 42 }, 0);
    expect(next.ctl).toBeLessThan(42);
    expect(next.atl).toBeLessThan(next.ctl);
  });
});

describe('pmcTsb', () => {
  it('is the difference between chronic and acute load', () => {
    expect(pmcTsb({ ctl: 80, atl: 95 })).toBe(-15);
  });
});

describe('runPmc', () => {
  it('returns nothing when the range is inverted', () => {
    expect(runPmc({ from: REF, to: daysBefore(1), dailyTss: new Map() })).toEqual([]);
  });

  it('emits one point per day, rest days included', () => {
    const series = runPmc({
      from: daysBefore(3),
      to: REF,
      dailyTss: new Map([[toTrainingDayId(REF), 100]]),
    });
    expect(series).toHaveLength(4);
    expect(series.slice(0, 3).map((p) => p.tss)).toEqual([0, 0, 0]);
    expect(series.at(-1)?.tss).toBe(100);
  });

  it('converges to the constant daily load over a long history', () => {
    const series = runPmc({
      from: daysBefore(729),
      to: REF,
      dailyTss: constantHistory(730, 70),
    });
    expect(series.at(-1)?.ctl).toBeCloseTo(70, 4);
    expect(series.at(-1)?.atl).toBeCloseTo(70, 4);
    expect(pmcTsb(series.at(-1)!)).toBeCloseTo(0, 4);
  });

  it('seeds from the cold start by default', () => {
    const [first] = runPmc({ from: REF, to: REF, dailyTss: new Map() });
    expect(PMC_COLD_START).toEqual({ ctl: 0, atl: 0 });
    expect(first.ctl).toBe(0);
  });
});

describe('window semantics (ADR-011)', () => {
  const dailyTss = constantHistory(730, 70);
  const full = runPmc({ from: daysBefore(729), to: REF, dailyTss });

  it('documents why a window must not seed the recurrence', () => {
    // The defect this module replaces: seeding at zero at the start of a rolling
    // window makes CTL a function of the window length, since convergence is
    // (1 - 1/tau)^n. Same athlete, same day, three different answers.
    const from28 = runPmc({ from: daysBefore(28), to: REF, dailyTss });
    const from90 = runPmc({ from: daysBefore(90), to: REF, dailyTss });

    expect(from28.at(-1)!.ctl).toBeCloseTo(70 * (1 - (1 - 1 / PMC_CTL_TAU) ** 29), 4);
    expect(from90.at(-1)!.ctl).toBeCloseTo(70 * (1 - (1 - 1 / PMC_CTL_TAU) ** 91), 4);

    // ~half the truth on a 28-day window, ~88% on a 90-day window.
    expect(from28.at(-1)!.ctl).toBeLessThan(40);
    expect(from90.at(-1)!.ctl).toBeLessThan(65);
    expect(full.at(-1)!.ctl).toBeCloseTo(70, 4);
  });

  it('INVARIANT: the value for a given day is identical at every display window', () => {
    // The regression guard. Every consumer slices a different window
    // (effort 28d, coach 90d, projection 180d). All must agree on the same day.
    const windows = [7, 28, 60, 90, 180, 365];
    const anchorCtl = windows.map((days) => slicePmcWindow(full, days, REF).at(-1)!.ctl);

    for (const ctl of anchorCtl) {
      expect(ctl).toBeCloseTo(full.at(-1)!.ctl, 10);
    }
  });

  it('INVARIANT: slicing changes the number of points, never their values', () => {
    const sliced = slicePmcWindow(full, 28, REF);
    expect(sliced.length).toBeLessThan(full.length);

    const byDate = new Map(full.map((p) => [p.date, p]));
    for (const point of sliced) {
      expect(point).toEqual(byDate.get(point.date));
    }
  });

  it('slices relative to the last point when no reference date is given', () => {
    expect(slicePmcWindow(full, 28)).toHaveLength(slicePmcWindow(full, 28, REF).length);
    expect(slicePmcWindow([] as PmcDayPoint[], 28)).toEqual([]);
  });
});

describe('incremental resumption (Phase B guarantee)', () => {
  it('resuming from a persisted day equals a full-history run exactly', () => {
    // The persisted PmcDay rows are a materialised view, not an authority. This
    // holds only because the recurrence is pure: resuming from day K-1 is not an
    // approximation of recomputing from the athlete's first day.
    const dailyTss = constantHistory(400, 55);
    const from = daysBefore(399);
    const full = runPmc({ from, to: REF, dailyTss });

    const splitAt = 300;
    const boundary = daysBefore(splitAt);
    const head = runPmc({ from, to: daysBefore(splitAt + 1), dailyTss });
    const tail = runPmc({
      from: boundary,
      to: REF,
      dailyTss,
      initial: { ctl: head.at(-1)!.ctl, atl: head.at(-1)!.atl },
    });

    expect([...head, ...tail]).toEqual(full);
  });

  it('a wrong seed stays wrong — the view must be rebuilt, never patched', () => {
    const dailyTss = constantHistory(100, 60);
    const from = daysBefore(99);
    const correct = runPmc({ from, to: REF, dailyTss });
    const reseeded = runPmc({ from, to: REF, dailyTss, initial: { ctl: 0, atl: 0 } });

    expect(correct).toEqual(reseeded); // identical here: `from` IS the first day
    expect(runPmc({ from: daysBefore(10), to: REF, dailyTss }).at(-1)!.ctl).not.toBeCloseTo(
      correct.at(-1)!.ctl,
      2,
    );
  });
});

describe('toTrainingDayId', () => {
  it('formats a training day key', () => {
    expect(toTrainingDayId(new Date('2026-08-11T23:30:00.000Z'))).toMatch(/^2026-08-1[12]$/);
  });
});
