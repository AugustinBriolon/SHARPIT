import { describe, expect, it } from 'vitest';
import {
  THRESHOLD_STALE_DAYS,
  resolveCalibrationConfidence,
} from '@/lib/plan/plan-calibration-confidence';

const NOW = new Date('2026-09-05T10:00:00.000Z');

describe('resolveCalibrationConfidence', () => {
  it('asks for a ruler when no threshold is set', () => {
    const line = resolveCalibrationConfidence({
      hasThreshold: false,
      syncedAt: null,
      hasPendingEstimate: false,
      now: NOW,
    });
    expect(line?.kind).toBe('missing');
  });

  it('flags a threshold older than one training block', () => {
    const stale = new Date(NOW);
    stale.setDate(stale.getDate() - (THRESHOLD_STALE_DAYS + 1));
    const line = resolveCalibrationConfidence({
      hasThreshold: true,
      syncedAt: stale.toISOString(),
      hasPendingEstimate: false,
      now: NOW,
    });
    expect(line?.kind).toBe('stale');
  });

  it('prefers a pending estimate over staleness', () => {
    const line = resolveCalibrationConfidence({
      hasThreshold: true,
      syncedAt: '2026-01-01T00:00:00.000Z',
      hasPendingEstimate: true,
      now: NOW,
    });
    expect(line?.kind).toBe('pending');
  });

  it('stays quiet when the ruler is current', () => {
    expect(
      resolveCalibrationConfidence({
        hasThreshold: true,
        syncedAt: NOW.toISOString(),
        hasPendingEstimate: false,
        now: NOW,
      }),
    ).toBeNull();
  });
});
