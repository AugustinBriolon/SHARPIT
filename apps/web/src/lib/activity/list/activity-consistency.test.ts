import { describe, expect, it } from 'vitest';
import {
  buildActivityConsistencyStats,
  buildConsistencyDayWindow,
  computeWeeklyActivityStreak,
  CONSISTENCY_FUTURE_DAYS,
  CONSISTENCY_PAST_DAYS,
  programWeekBarPct,
  resolveConsistencyDayLayout,
} from '@/lib/activity/list/activity-consistency';

const ref = new Date('2026-07-06T12:00:00');

describe('computeWeeklyActivityStreak', () => {
  it('returns 0 when no activities', () => {
    expect(computeWeeklyActivityStreak([], ref)).toEqual({
      currentStreak: 0,
      activeThisWeek: false,
    });
  });

  it('counts consecutive weeks with at least one session', () => {
    const activities = [
      { date: new Date('2026-07-01'), load: 50 },
      { date: new Date('2026-06-24'), load: 40 },
      { date: new Date('2026-06-10'), load: 30 },
    ];
    expect(computeWeeklyActivityStreak(activities, ref).currentStreak).toBe(2);
  });

  it('does not break streak when current week has no session yet', () => {
    const activities = [{ date: new Date('2026-06-30'), load: 50 }];
    const result = computeWeeklyActivityStreak(activities, ref);
    expect(result.activeThisWeek).toBe(false);
    expect(result.currentStreak).toBe(1);
  });

  it('marks activeThisWeek when a session exists in the current week', () => {
    const activities = [{ date: new Date('2026-07-06'), load: 20 }];
    const result = computeWeeklyActivityStreak(activities, ref);
    expect(result.activeThisWeek).toBe(true);
    expect(result.currentStreak).toBe(1);
  });
});

describe('buildActivityConsistencyStats', () => {
  it('builds a year heatmap with intensity levels', () => {
    const stats = buildActivityConsistencyStats(
      [
        { date: new Date('2026-07-06'), load: 120 },
        { date: new Date('2026-07-06'), load: 80 },
        { date: new Date('2026-07-01'), load: 10 },
      ],
      ref,
    );

    expect(stats.cells.length).toBeGreaterThan(HEATMAP_MIN_DAYS);
    expect(stats.weekColumns.length).toBeGreaterThan(50);
    expect(stats.activeDays).toBe(2);
    expect(stats.trailingYearActivityCount).toBe(3);

    const today = stats.cells.find((c) => c.date === '2026-07-06' && c.inRange);
    expect(today?.level).toBeGreaterThanOrEqual(3);
  });

  it('counts sessions over the trailing 12 months, not calendar year', () => {
    const stats = buildActivityConsistencyStats(
      [
        { date: new Date('2026-07-06'), load: 40 },
        { date: new Date('2026-01-15'), load: 30 },
        { date: new Date('2025-08-01'), load: 20 },
        { date: new Date('2025-07-01'), load: 20 },
      ],
      ref,
    );

    expect(stats.trailingYearActivityCount).toBe(3);
  });

  it('keeps an 8-week strip while heldWeeks reports the full weekly streak', () => {
    const stats = buildActivityConsistencyStats(
      [
        { date: new Date('2026-07-06'), load: 40 },
        { date: new Date('2026-06-30'), load: 30 },
        { date: new Date('2026-06-16'), load: 20 },
      ],
      ref,
    );

    expect(stats.thisWeekSessionCount).toBe(1);
    expect(stats.programWeeks).toHaveLength(8);
    expect(stats.programWeeks.at(-1)?.isCurrent).toBe(true);
    expect(stats.currentStreak).toBe(2);
    expect(stats.heldWeeks).toBe(2);
  });
});

describe('programWeekBarPct', () => {
  it('keeps 4 sessions shorter than 7 in the same window', () => {
    expect(programWeekBarPct(4, 7)).toBe(57);
    expect(programWeekBarPct(7, 7)).toBe(100);
  });

  it('does not fill the strip when the busiest week is only 4 sessions', () => {
    expect(programWeekBarPct(4, 4)).toBe(57);
  });

  it('leaves an empty week as a stub, not a missing column', () => {
    expect(programWeekBarPct(0, 7)).toBe(10);
  });
});

describe('buildConsistencyDayWindow', () => {
  it('returns past days, today, and upcoming days with activity rings', () => {
    const days = buildConsistencyDayWindow(
      [
        { date: new Date('2026-07-06'), load: 40 },
        { date: new Date('2026-07-04'), load: 20 },
      ],
      ref,
    );

    expect(days).toHaveLength(CONSISTENCY_PAST_DAYS + 1 + CONSISTENCY_FUTURE_DAYS);
    expect(days.find((day) => day.isToday)?.date).toBe('2026-07-06');
    expect(days.find((day) => day.date === '2026-07-06')?.hasActivity).toBe(true);
    expect(days.find((day) => day.date === '2026-07-04')?.hasActivity).toBe(true);
    expect(days.filter((day) => day.isFuture)).toHaveLength(CONSISTENCY_FUTURE_DAYS);
    expect(days.at(-1)?.isFuture).toBe(true);
  });
});

describe('resolveConsistencyDayLayout', () => {
  it('grows columns and rows as the strip gets wider', () => {
    const narrow = resolveConsistencyDayLayout(160);
    const medium = resolveConsistencyDayLayout(260);
    const wide = resolveConsistencyDayLayout(420);

    expect(narrow.rows).toBe(1);
    expect(narrow.columns).toBeGreaterThanOrEqual(4);
    expect(medium.rows).toBe(2);
    expect(wide.rows).toBe(3);
    expect(wide.columns).toBe(7);
    expect(wide.totalDays).toBeGreaterThan(medium.totalDays);
    expect(wide.futureDays).toBe(CONSISTENCY_FUTURE_DAYS);
  });
});

const HEATMAP_MIN_DAYS = 360;
