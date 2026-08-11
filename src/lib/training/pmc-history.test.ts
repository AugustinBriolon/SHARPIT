import { ActivityType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import type { ActivityForAnalytics } from './activity-load';
import { slicePmcWindow } from './pmc';
import { aggregateDailyTss, computeAthletePmc, toPmcPoints } from './pmc-history';

const REF_DATE = new Date('2026-01-31T12:00:00.000Z');

function makeActivity(
  date: Date,
  type: ActivityType,
  load: number | null = null,
): ActivityForAnalytics {
  return { date, type, duration: null, load, bikeMetrics: null };
}

function daysBefore(n: number): Date {
  const day = new Date(REF_DATE);
  day.setUTCDate(day.getUTCDate() - n);
  return day;
}

/** `count` consecutive days ending `endingDaysAgo` days before REF_DATE. */
function block(count: number, load: number, endingDaysAgo = 0): ActivityForAnalytics[] {
  return Array.from({ length: count }, (_, i) =>
    makeActivity(daysBefore(endingDaysAgo + i), 'RUN', load),
  );
}

describe('aggregateDailyTss', () => {
  it('sums several activities on the same day', () => {
    const dailyTss = aggregateDailyTss([
      makeActivity(REF_DATE, 'RUN', 50),
      makeActivity(REF_DATE, 'BIKE', 40),
    ]);
    expect(dailyTss.get('2026-01-31')).toBe(90);
  });
});

describe('computeAthletePmc', () => {
  it('returns nothing when the athlete has no activity', () => {
    // No first day means no recurrence to run. Callers treat this as "no chart".
    expect(computeAthletePmc([], { refDate: REF_DATE })).toEqual([]);
  });

  it('starts at the first recorded day and runs to the reference day', () => {
    const series = computeAthletePmc(block(1, 100, 3), { refDate: REF_DATE });
    expect(series.at(0)?.date).toBe('2026-01-28');
    expect(series.at(-1)?.date).toBe('2026-01-31');
  });

  it('carries rest days so chronic load decays across gaps', () => {
    const series = computeAthletePmc(block(1, 100, 10), { refDate: REF_DATE });
    expect(series).toHaveLength(11);
    expect(series.at(-1)!.ctl).toBeLessThan(series.at(0)!.ctl);
    expect(series.slice(1).every((p) => p.tss === 0)).toBe(true);
  });

  it('makes acute load respond faster than chronic load', () => {
    // tau_atl (7d) << tau_ctl (42d), so one hard session moves ATL far more.
    const anchor = computeAthletePmc([makeActivity(REF_DATE, 'RUN', 200)], {
      refDate: REF_DATE,
    }).at(-1)!;
    expect(anchor.atl).toBeGreaterThan(anchor.ctl * 3);
  });

  it('reports negative TSB for a heavy week off a cold start', () => {
    const anchor = computeAthletePmc(block(7, 70), { refDate: REF_DATE }).at(-1)!;
    expect(anchor.atl).toBeGreaterThan(anchor.ctl);
  });

  it('reports positive TSB after detraining', () => {
    // 15 loaded days, then 15 days of nothing: residual CTL, decayed ATL.
    const anchor = computeAthletePmc(block(15, 80, 15), { refDate: REF_DATE }).at(-1)!;
    expect(anchor.ctl).toBeGreaterThan(anchor.atl);
  });

  it('ignores activities dated after the reference day', () => {
    const withFuture = [
      ...block(5, 60),
      makeActivity(new Date('2026-06-01T12:00:00.000Z'), 'RUN', 900),
    ];
    const anchor = computeAthletePmc(withFuture, { refDate: REF_DATE }).at(-1)!;
    const baseline = computeAthletePmc(block(5, 60), { refDate: REF_DATE }).at(-1)!;
    expect(anchor.ctl).toBeCloseTo(baseline.ctl, 10);
  });
});

describe('window independence (the regression this module fixes)', () => {
  // Two years of steady 70 TSS/day: CTL converges to 70.
  const activities = block(730, 70);
  const series = computeAthletePmc(activities, { refDate: REF_DATE });

  it('anchors CTL at the true steady state regardless of chart width', () => {
    expect(series.at(-1)!.ctl).toBeCloseTo(70, 3);

    for (const days of [28, 60, 90, 180]) {
      const windowed = slicePmcWindow(series, days, REF_DATE);
      expect(windowed.at(-1)!.ctl).toBeCloseTo(series.at(-1)!.ctl, 10);
    }
  });

  it('would have reported roughly half the truth on the old 28-day dashboard', () => {
    // Documents the defect: computing only across the displayed window reached
    // 1 - (1 - 1/42)^29 of steady state. Kept as a guard against reintroducing it.
    const windowOnly = computeAthletePmc(activities, {
      refDate: REF_DATE,
      from: daysBefore(28),
    });
    expect(windowOnly.at(-1)!.ctl).toBeLessThan(series.at(-1)!.ctl * 0.55);
  });
});

describe('toPmcPoints', () => {
  it('rounds and labels for the chart contract', () => {
    const [point] = toPmcPoints([{ date: '2026-01-31', tss: 90, ctl: 41.6, atl: 55.4 }]);
    expect(point).toMatchObject({ date: '2026-01-31', tss: 90, ctl: 42, atl: 55 });
    expect(point.tsb).toBe(Math.round(41.6 - 55.4));
    expect(point.label).toBeTruthy();
  });
});
