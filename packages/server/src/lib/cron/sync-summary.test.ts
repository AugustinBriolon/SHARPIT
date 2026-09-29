import { describe, expect, it } from 'vitest';
import {
  summarizeCronSyncResults,
  type CronAthleteSyncResult,
} from '@sharpit/server/lib/cron/sync-summary';

function athlete(
  partial: Partial<CronAthleteSyncResult> & { athleteId: string },
): CronAthleteSyncResult {
  return {
    providerSyncCount: 0,
    briefing: false,
    briefingSkippedNoChange: false,
    weeklyReview: false,
    errors: [],
    needsReconnect: [],
    decryptAuthenticity: false,
    skippedByCircuitBreaker: false,
    ...partial,
  };
}

describe('summarizeCronSyncResults', () => {
  it('returns compact counts instead of the full athlete array', () => {
    const results = [
      athlete({ athleteId: 'a1', errors: ['Strava: boom'] }),
      athlete({ athleteId: 'a2', needsReconnect: ['Garmin'] }),
      athlete({ athleteId: 'a3', decryptAuthenticity: true }),
    ];

    const summary = summarizeCronSyncResults(results, {
      circuitBreakerTripped: false,
      circuitBreakerReason: null,
      authenticityFailureCount: 1,
    });

    expect(summary).not.toHaveProperty('athletes');
    expect(summary.athletesProcessed).toBe(3);
    expect(summary.errorCount).toBe(1);
    expect(summary.needsReconnectCount).toBe(1);
    expect(summary.decryptAuthenticityFailureCount).toBe(1);
    // Sparse authenticity failures are reported but do not alone fail the run.
    expect(summary.ok).toBe(false);
    expect(summary.sampleAthleteIdsWithErrors).toEqual(['a1']);
    expect(summary.sampleAthleteIdsNeedingReconnect).toEqual(['a2']);
  });

  it('marks ok false when the decrypt circuit breaker tripped', () => {
    const summary = summarizeCronSyncResults([athlete({ athleteId: 'a1' })], {
      circuitBreakerTripped: true,
      circuitBreakerReason: 'tripped',
      authenticityFailureCount: 5,
    });
    expect(summary.ok).toBe(false);
    expect(summary.circuitBreakerTripped).toBe(true);
  });

  it('counts athletes whose state rebuild was skipped for lack of new data', () => {
    const summary = summarizeCronSyncResults(
      [
        athlete({ athleteId: 'a1', briefingSkippedNoChange: true }),
        athlete({ athleteId: 'a2', briefing: true }),
        athlete({ athleteId: 'a3', briefingSkippedNoChange: true }),
      ],
      { circuitBreakerTripped: false, circuitBreakerReason: null, authenticityFailureCount: 0 },
    );
    expect(summary.athletesUnchanged).toBe(2);
    expect(summary.ok).toBe(true);
  });
});
