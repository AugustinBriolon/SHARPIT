import { describe, expect, it } from 'vitest';
import {
  buildActivityConsistencyStats,
  computeWeeklyActivityStreak,
} from '@/lib/activity/activity-consistency';

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
});

const HEATMAP_MIN_DAYS = 360;
