import { describe, expect, it } from 'vitest';
import { deltaVsTrailingWeek, observedRange } from '@/lib/today/marker-series';

describe('deltaVsTrailingWeek', () => {
  it('compares today against the mean of the seven days before', () => {
    // Seven days at 70, today at 60 — ten below the trailing mean.
    expect(deltaVsTrailingWeek([70, 70, 70, 70, 70, 70, 70, 60])).toBe(-10);
  });

  it('ignores gaps rather than treating them as zero', () => {
    expect(deltaVsTrailingWeek([70, null, 70, 70, 70, 70, 70, 70, 60])).toBe(-10);
  });

  it('says nothing when a week of history is missing', () => {
    expect(deltaVsTrailingWeek([70, 70, 60])).toBeNull();
  });
});

describe('observedRange', () => {
  it('reports the span actually seen', () => {
    expect(observedRange([40, 52, 47, 38])).toEqual({ low: 38, high: 52 });
  });

  it('returns nothing on a flat series — a band of zero width positions nothing', () => {
    expect(observedRange([47, 47, 47])).toBeNull();
  });

  it('returns nothing without enough readings to call it a range', () => {
    expect(observedRange([47, 50])).toBeNull();
  });
});
