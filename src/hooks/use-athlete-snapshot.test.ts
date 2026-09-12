import { describe, expect, it } from 'vitest';
import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import { SNAPSHOT_MAX_POLLS, snapshotRefetchIntervalMs } from './use-athlete-snapshot';

/**
 * `END_OF_DAY` with a just-generated snapshot is the one shape the phase-drift
 * rule leaves alone at any hour, so these cases test the polling bound itself
 * rather than the clock.
 */
function snapshotWith(freshness: string): AthleteSnapshot {
  return {
    generatedAt: new Date(),
    dailyPhase: { phase: 'END_OF_DAY' },
    freshness: { domains: [{ domain: 'recommendations', freshness }] },
  } as unknown as AthleteSnapshot;
}

describe('snapshotRefetchIntervalMs', () => {
  it('waits on recommendations that are still coming', () => {
    for (const state of ['stale', 'awaiting_data', 'computing']) {
      expect(snapshotRefetchIntervalMs(snapshotWith(state), 0)).toBe(12_000);
    }
  });

  it('stops once the recommendations are fresh', () => {
    expect(snapshotRefetchIntervalMs(snapshotWith('fresh'), 0)).toBe(false);
  });

  it('gives up after a bounded number of tries', () => {
    // Recommendations that never turn fresh (failing briefing, provider down)
    // polled a multi-second refresh every 12 s forever, on every page.
    expect(snapshotRefetchIntervalMs(snapshotWith('stale'), SNAPSHOT_MAX_POLLS - 1)).toBe(12_000);
    expect(snapshotRefetchIntervalMs(snapshotWith('stale'), SNAPSHOT_MAX_POLLS)).toBe(false);
    expect(snapshotRefetchIntervalMs(snapshotWith('stale'), SNAPSHOT_MAX_POLLS + 5)).toBe(false);
  });
});
