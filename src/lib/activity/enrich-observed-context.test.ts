import { describe, expect, it } from 'vitest';
import { isActivityToday } from '@/lib/activity/activity-day';
import { shouldRefreshActivityNarrative } from '@/lib/activity/enrich-observed-context';

describe('isActivityToday', () => {
  it('matches local calendar day', () => {
    const now = new Date(2026, 6, 27, 18, 0, 0);
    expect(isActivityToday(new Date(2026, 6, 27, 8, 0, 0), now)).toBe(true);
    expect(isActivityToday(new Date(2026, 6, 19, 15, 0, 0), now)).toBe(false);
  });
});

describe('shouldRefreshActivityNarrative', () => {
  it('does not auto-run for historical activities even without narrative', () => {
    expect(
      shouldRefreshActivityNarrative({
        isToday: false,
        hasNarrative: false,
        weatherUpdated: false,
        locationNew: false,
      }),
    ).toBe(false);
  });

  it('does not re-run historical narrative on weather version bump', () => {
    expect(
      shouldRefreshActivityNarrative({
        isToday: false,
        hasNarrative: true,
        weatherUpdated: true,
        locationNew: false,
      }),
    ).toBe(false);
  });

  it('runs today when narrative is missing', () => {
    expect(
      shouldRefreshActivityNarrative({
        isToday: true,
        hasNarrative: false,
        weatherUpdated: false,
        locationNew: false,
      }),
    ).toBe(true);
  });

  it('re-runs today narrative when weather or location context changed', () => {
    expect(
      shouldRefreshActivityNarrative({
        isToday: true,
        hasNarrative: true,
        weatherUpdated: true,
        locationNew: false,
      }),
    ).toBe(true);
    expect(
      shouldRefreshActivityNarrative({
        isToday: true,
        hasNarrative: true,
        weatherUpdated: false,
        locationNew: true,
      }),
    ).toBe(true);
  });

  it('honours force even on historical activities', () => {
    expect(
      shouldRefreshActivityNarrative({
        force: true,
        isToday: false,
        hasNarrative: true,
        weatherUpdated: false,
        locationNew: false,
      }),
    ).toBe(true);
  });
});
