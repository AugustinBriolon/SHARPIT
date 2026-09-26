import { NextResponse } from 'next/server';
import { prisma } from '@sharpit/db/client';
import { mapWithConcurrency } from '@/lib/async/map-with-concurrency';
import { verifyCronSecret } from '@/lib/cron/verify-cron-secret';
import { DecryptCircuitBreaker } from '@/lib/cron/decrypt-circuit-breaker';
import { summarizeCronSyncResults, type CronAthleteSyncResult } from '@/lib/cron/sync-summary';
import { canRunHealthDerivedAthleteRefresh } from '@/lib/privacy/consent-withdraw-ux';
import {
  backfillStreamsIfNeeded,
  emptyAthleteResult,
  generateWeeklyReviewIfSunday,
  loadAthleteSyncContext,
  refreshAthleteBriefing,
  syncConnectedProviders,
} from '@/lib/sync/athlete-provider-sync';

export const maxDuration = 300;

/** Bounded concurrency across athletes — each provider call is already rate-limit-aware per account. */
const ATHLETE_CONCURRENCY = 3;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

async function syncOneAthlete(
  athleteId: string,
  breaker: DecryptCircuitBreaker,
): Promise<CronAthleteSyncResult> {
  const result = emptyAthleteResult(athleteId);

  if (breaker.isTripped()) {
    result.skippedByCircuitBreaker = true;
    return result;
  }

  const { accounts, hasHealthConsent, hasAiConsent } = await loadAthleteSyncContext(athleteId);

  await syncConnectedProviders(athleteId, accounts, result, { hasHealthConsent });
  breaker.recordAthleteProcessed({ authenticityFailure: result.decryptAuthenticity });

  if (breaker.isTripped()) {
    // Stop further credential-mutating / heavy work for this athlete once tripped mid-flight.
    return result;
  }

  await backfillStreamsIfNeeded(athleteId, accounts, result);
  // Art. 9: without health consent, skip Twin/briefing refresh — skipSync still
  // re-reads stored dailyHealth/HRV and would recreate purged evidence.
  if (canRunHealthDerivedAthleteRefresh(hasHealthConsent)) {
    await refreshAthleteBriefing(athleteId, result);
  }
  // Weekly review loads getHealthEntries — require health consent as well as AI.
  if (hasAiConsent && canRunHealthDerivedAthleteRefresh(hasHealthConsent)) {
    await generateWeeklyReviewIfSunday(athleteId, result);
  }

  return result;
}

/** Synchro planifiée (Vercel Cron) : providers connectés, pour chaque athlète. */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return unauthorized();
  }

  const athletes = await prisma.athleteProfile.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });
  const breaker = new DecryptCircuitBreaker();

  const results = await mapWithConcurrency(athletes, ATHLETE_CONCURRENCY, (athlete) =>
    syncOneAthlete(athlete.id, breaker),
  );

  if (breaker.isTripped()) {
    console.error(`[cron/sync] ${breaker.tripReason()}`);
  }

  const summary = summarizeCronSyncResults(results, {
    circuitBreakerTripped: breaker.isTripped(),
    circuitBreakerReason: breaker.isTripped() ? breaker.tripReason() : null,
    authenticityFailureCount: breaker.authenticityFailureCount,
  });

  return NextResponse.json(summary, {
    status: summary.circuitBreakerTripped ? 503 : 200,
  });
}
