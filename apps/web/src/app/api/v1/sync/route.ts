import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { canRunHealthDerivedAthleteRefresh } from '@/lib/privacy/consent-withdraw-ux';
import { projectV1SyncStatus } from '@/lib/presentation/v1/sync-status';
import { checkRateLimit, rateLimitJsonResponse, rateLimiters } from '@/lib/rate-limit';
import {
  backfillStreamsIfNeeded,
  connectedProviderSet,
  emptyAthleteResult,
  loadAthleteSyncContext,
  refreshAthleteBriefing,
  syncConnectedProviders,
} from '@/lib/sync/athlete-provider-sync';

export const maxDuration = 300;

/**
 * Pulls every connected provider for the signed-in athlete, now, and rebuilds their state —
 * what the scheduled sync does, on demand. The native app calls it when it opens, so a
 * night or a session reaches the app without a detour through the web.
 */
export async function POST() {
  try {
    const athleteId = await getCurrentAthleteId();
    const rateLimit = await checkRateLimit(rateLimiters.providerSync, `${athleteId}:app-sync`, {
      failClosed: true,
    });
    if (!rateLimit.ok) {
      const limited = rateLimitJsonResponse(rateLimit);
      return NextResponse.json(limited.body, { status: limited.status });
    }

    const { accounts, hasHealthConsent } = await loadAthleteSyncContext(athleteId);
    const result = emptyAthleteResult(athleteId);
    await syncConnectedProviders(athleteId, accounts, result, { hasHealthConsent });
    await backfillStreamsIfNeeded(athleteId, accounts, result);
    // Art. 9: without health consent the state refresh would rebuild purged evidence.
    if (canRunHealthDerivedAthleteRefresh(hasHealthConsent)) {
      await refreshAthleteBriefing(athleteId, result);
    }

    const { accounts: refreshed } = await loadAthleteSyncContext(athleteId);
    return NextResponse.json(
      projectV1SyncStatus(refreshed, connectedProviderSet(refreshed), result.needsReconnect),
    );
  } catch (error) {
    console.error('[api/v1/sync]', error);
    return NextResponse.json({ error: 'Synchronisation impossible' }, { status: 500 });
  }
}
