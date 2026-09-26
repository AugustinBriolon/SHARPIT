import { describe, expect, it } from 'vitest';
import { projectV1Consistency } from './consistency';

// A Wednesday, so the ISO week has days on both sides of the reference.
const WEDNESDAY = new Date('2026-09-16T09:00:00Z');

function activity(date: string) {
  return { date, load: 40 };
}

describe('projectV1Consistency', () => {
  it('returns a window that ends after today', () => {
    const { days } = projectV1Consistency([], WEDNESDAY);

    expect(days.filter((day) => day.isToday)).toHaveLength(1);
    expect(days.filter((day) => day.isFuture).length).toBeGreaterThan(0);
    expect(days.at(-1)?.isFuture).toBe(true);
  });

  it('orders the window oldest first', () => {
    const dates = projectV1Consistency([], WEDNESDAY).days.map((day) => day.date);

    expect(dates).toEqual([...dates].sort());
  });

  it('marks the days that carry an activity', () => {
    const { days } = projectV1Consistency(
      [activity('2026-09-14'), activity('2026-09-16')],
      WEDNESDAY,
    );

    const byDate = new Map(days.map((day) => [day.date, day.hasActivity]));
    expect(byDate.get('2026-09-14')).toBe(true);
    expect(byDate.get('2026-09-15')).toBe(false);
    expect(byDate.get('2026-09-16')).toBe(true);
  });

  it('collapses several activities on one day into a single marked day', () => {
    const { days } = projectV1Consistency(
      [activity('2026-09-16'), activity('2026-09-16')],
      WEDNESDAY,
    );

    expect(days.filter((day) => day.hasActivity)).toHaveLength(1);
  });

  it('counts the sessions of the current ISO week, not of the window', () => {
    // 14th is the Monday of the reference week; the 13th is the Sunday before it and
    // sits inside the day window, so a window-based count would say three.
    const { thisWeekSessionCount } = projectV1Consistency(
      [activity('2026-09-13'), activity('2026-09-14'), activity('2026-09-16')],
      WEDNESDAY,
    );

    expect(thisWeekSessionCount).toBe(2);
  });

  it('counts every session, including several on one day', () => {
    const { thisWeekSessionCount } = projectV1Consistency(
      [activity('2026-09-16'), activity('2026-09-16')],
      WEDNESDAY,
    );

    expect(thisWeekSessionCount).toBe(2);
  });

  it('reports a quiet week as zero rather than omitting it', () => {
    expect(projectV1Consistency([], WEDNESDAY).thisWeekSessionCount).toBe(0);
  });

  it('carries a single-letter weekday label for each day', () => {
    const { days } = projectV1Consistency([], WEDNESDAY);

    for (const day of days) {
      expect(day.weekdayLabel).toMatch(/^[A-ZÀ-Ÿ]$/);
    }
  });

  it('carries the day of the month for each day', () => {
    const { days } = projectV1Consistency([], WEDNESDAY);

    for (const day of days) {
      expect(day.dayOfMonth).toBe(Number(day.date.slice(-2)));
    }
  });
});
