const SAMPLE_LIMIT = 10;

export type CronAthleteSyncResult = {
  athleteId: string;
  providerSyncCount: number;
  briefing: boolean;
  weeklyReview: boolean;
  errors: string[];
  needsReconnect: string[];
  decryptAuthenticity: boolean;
  skippedByCircuitBreaker: boolean;
};

export type CronSyncSummary = {
  ok: boolean;
  athletesProcessed: number;
  athletesSkippedByCircuitBreaker: number;
  errorCount: number;
  needsReconnectCount: number;
  decryptAuthenticityFailureCount: number;
  circuitBreakerTripped: boolean;
  circuitBreakerReason: string | null;
  sampleAthleteIdsWithErrors: string[];
  sampleAthleteIdsNeedingReconnect: string[];
  sampleErrors: Array<{ athleteId: string; error: string }>;
};

function pushSample(list: string[], athleteId: string): void {
  if (list.length < SAMPLE_LIMIT) {
    list.push(athleteId);
  }
}

function accumulateAthlete(
  result: CronAthleteSyncResult,
  acc: {
    errorCount: number;
    needsReconnectCount: number;
    skipped: number;
    sampleAthleteIdsWithErrors: string[];
    sampleAthleteIdsNeedingReconnect: string[];
    sampleErrors: Array<{ athleteId: string; error: string }>;
  },
): void {
  if (result.skippedByCircuitBreaker) {
    acc.skipped += 1;
  }
  if (result.errors.length > 0) {
    acc.errorCount += result.errors.length;
    pushSample(acc.sampleAthleteIdsWithErrors, result.athleteId);
    for (const error of result.errors) {
      if (acc.sampleErrors.length < SAMPLE_LIMIT) {
        acc.sampleErrors.push({ athleteId: result.athleteId, error });
      }
    }
  }
  if (result.needsReconnect.length > 0) {
    acc.needsReconnectCount += result.needsReconnect.length;
    pushSample(acc.sampleAthleteIdsNeedingReconnect, result.athleteId);
  }
}

/**
 * Compact cron HTTP body for large N — counts + sampled ids, never the full
 * per-athlete array (and never ciphertext / tokens).
 */
export function summarizeCronSyncResults(
  results: readonly CronAthleteSyncResult[],
  meta: {
    circuitBreakerTripped: boolean;
    circuitBreakerReason: string | null;
    authenticityFailureCount: number;
  },
): CronSyncSummary {
  const acc = {
    errorCount: 0,
    needsReconnectCount: 0,
    skipped: 0,
    sampleAthleteIdsWithErrors: [] as string[],
    sampleAthleteIdsNeedingReconnect: [] as string[],
    sampleErrors: [] as Array<{ athleteId: string; error: string }>,
  };
  for (const result of results) {
    accumulateAthlete(result, acc);
  }

  return {
    ok: !meta.circuitBreakerTripped && acc.errorCount === 0,
    athletesProcessed: results.length,
    athletesSkippedByCircuitBreaker: acc.skipped,
    errorCount: acc.errorCount,
    needsReconnectCount: acc.needsReconnectCount,
    decryptAuthenticityFailureCount: meta.authenticityFailureCount,
    circuitBreakerTripped: meta.circuitBreakerTripped,
    circuitBreakerReason: meta.circuitBreakerReason,
    sampleAthleteIdsWithErrors: acc.sampleAthleteIdsWithErrors,
    sampleAthleteIdsNeedingReconnect: acc.sampleAthleteIdsNeedingReconnect,
    sampleErrors: acc.sampleErrors,
  };
}
