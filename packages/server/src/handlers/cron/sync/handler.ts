import {
  notifySourcesToReconnect,
  wakeAppForWidgets,
} from '@sharpit/server/lib/push/athlete-notifications';
import { NextResponse } from 'next/server';
import { sendMorningPushOnceNightIsRead } from '@sharpit/server/lib/push/morning-push';
import { prisma } from '@sharpit/db/client';
import { mapWithConcurrency } from '@sharpit/server/lib/async/map-with-concurrency';
import { verifyCronSecret } from '@sharpit/server/lib/cron/verify-cron-secret';
import { DecryptCircuitBreaker } from '@sharpit/server/lib/cron/decrypt-circuit-breaker';
import {
  summarizeCronSyncResults,
  type CronAthleteSyncResult,
} from '@sharpit/server/lib/cron/sync-summary';
import { canRunHealthDerivedAthleteRefresh } from '@sharpit/app/lib/privacy/consent-withdraw-ux';
import {
  cronSyncAthleteFilter,
  shouldRefreshAthleteStateAfterCronSync,
} from '@sharpit/server/lib/cron/cron-state-refresh-gate';
import { hasEvidenceWrittenSince } from '@sharpit/server/infrastructure/athlete-state/evidence-watermark-repository';
import { getLatestAthleteSnapshot } from '@sharpit/server/infrastructure/athlete-state/snapshot-repository';
import { trainingDayIdNow } from '@sharpit/server/lib/athlete-state/freshness-service';
import {
  backfillStreamsIfNeeded,
  emptyAthleteResult,
  generateWeeklyReviewIfSunday,
  loadAthleteSyncContext,
  refreshAthleteBriefing,
  syncConnectedProviders,
  type AthleteSyncResult,
} from '@sharpit/server/lib/sync/athlete-provider-sync';

/** Bounded concurrency across athletes — each provider call is already rate-limit-aware per account. */
const ATHLETE_CONCURRENCY = 3;

async function athleteStateNeedsRefresh(
  athleteId: string,
  syncStartedAt: Date,
  result: AthleteSyncResult,
): Promise<boolean> {
  const [evidenceWrittenDuringSync, todaySnapshot] = await Promise.all([
    hasEvidenceWrittenSince(athleteId, syncStartedAt),
    getLatestAthleteSnapshot({ athleteId, trainingDayId: trainingDayIdNow() }),
  ]);
  return shouldRefreshAthleteStateAfterCronSync({
    evidenceWrittenDuringSync,
    backfilledStreamCount: result.backfilledActivityIds.length,
    hasSnapshotForTrainingDay: todaySnapshot !== null,
  });
}

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

  const syncStartedAt = new Date();
  await syncConnectedProviders(athleteId, accounts, result, { hasHealthConsent });
  breaker.recordAthleteProcessed({ authenticityFailure: result.decryptAuthenticity });
  // The in-app sync shows what to reconnect; only the scheduled one, unseen, needs a push.
  await notifySourcesToReconnect(athleteId, result.needsReconnect).catch((error) =>
    console.error('[cron/sync] reconnect push', athleteId, error),
  );

  if (breaker.isTripped()) {
    // Stop further credential-mutating / heavy work for this athlete once tripped mid-flight.
    return result;
  }

  await backfillStreamsIfNeeded(athleteId, accounts, result);
  // Art. 9: without health consent, skip Twin/briefing refresh — skipSync still
  // re-reads stored dailyHealth/HRV and would recreate purged evidence.
  if (canRunHealthDerivedAthleteRefresh(hasHealthConsent)) {
    if (await athleteStateNeedsRefresh(athleteId, syncStartedAt, result)) {
      await refreshAthleteBriefing(athleteId, result);
    } else {
      result.briefingSkippedNoChange = true;
    }
  }
  // The day was recomputed: the app's widgets show it without the athlete opening the app.
  if (result.briefing) {
    await wakeAppForWidgets(athleteId);
  }
  // The night came in with this sync: the morning push goes out now, once a day.
  if (canRunHealthDerivedAthleteRefresh(hasHealthConsent)) {
    await sendMorningPushOnceNightIsRead(athleteId).catch((error) =>
      console.error('[cron/sync] morning push', athleteId, error),
    );
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
    where: cronSyncAthleteFilter(),
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
