import { describe, expect, it, vi } from 'vitest';
import { computeGoalProgress, daysUntil, isGoalReached } from '@/lib/goals/goals';

describe('computeGoalProgress', () => {
  it('returns 100 when lower-is-better target is met', () => {
    expect(
      computeGoalProgress({
        startValue: 2800,
        currentValue: 2400,
        targetValue: 2500,
        lowerIsBetter: true,
      }),
    ).toBe(100);
  });

  it('computes partial progress for higher-is-better goals', () => {
    expect(
      computeGoalProgress({
        startValue: 0,
        currentValue: 50,
        targetValue: 100,
        lowerIsBetter: false,
      }),
    ).toBe(50);
  });
});

describe('isGoalReached', () => {
  it('respects lowerIsBetter for chrono goals', () => {
    expect(
      isGoalReached({
        startValue: 2800,
        currentValue: 2400,
        targetValue: 2500,
        lowerIsBetter: true,
      }),
    ).toBe(true);
  });
});

describe('daysUntil', () => {
  it('returns positive days before target date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-07T12:00:00'));
    expect(daysUntil(new Date('2026-12-31T12:00:00'))).toBe(177);
    vi.useRealTimers();
  });
});
