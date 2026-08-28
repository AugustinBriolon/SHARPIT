import { describe, expect, it } from 'vitest';
import { nextSelectedStreamMetricKeys } from './activity-stream-chart-helpers';

describe('nextSelectedStreamMetricKeys', () => {
  it('adds a second metric when under the cap', () => {
    expect(nextSelectedStreamMetricKeys(['hr'], 'watts')).toEqual(['hr', 'watts']);
  });

  it('replaces the oldest metric when a third is selected', () => {
    expect(nextSelectedStreamMetricKeys(['hr', 'watts'], 'alt')).toEqual(['watts', 'alt']);
  });

  it('keeps at least one active metric', () => {
    expect(nextSelectedStreamMetricKeys(['hr'], 'hr')).toEqual(['hr']);
  });
});
