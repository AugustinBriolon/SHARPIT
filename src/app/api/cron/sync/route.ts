import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapWithConcurrency } from '@/lib/async/map-with-concurrency';
import { refreshAthleteState } from '@/lib/athlete-state/orchestrator';
import { getGarminAccount, syncGarminHealth } from '@/lib/integrations/garmin/garmin-sync';
import { syncGarminActivities } from '@/lib/integrations/garmin/garmin-activity-sync';
import { getGoogleAccount, syncFromGoogle } from '@/lib/integrations/google/google-sync';
import { getMfpAccount, syncMfpNutrition } from '@/lib/integrations/myfitnesspal/myfitnesspal-sync';
import { updateRecordsAfterProviderSync } from '@/lib/training/records';
import { getRenphoAccount, syncRenphoHealth } from '@/lib/integrations/renpho/renpho-sync';
import { getWithingsAccount, syncWithingsHealth } from '@/lib/integrations/withings/withings-sync';
import { CRON_BACKFILL_BATCH, backfillActivityStreams } from '@/lib/streams/stream-backfill';
import { getStravaAccount, syncStravaActivities } from '@/lib/integrations/strava/strava-sync';
import { generateAndStoreWeeklyReview, isSunday } from '@/lib/weekly-review';
import { isCoachConfigured } from '@/lib/ai';
import { verifyCronSecret } from '@/lib/cron/verify-cron-secret';
import { shouldCronSyncProvider } from '@/lib/cron/provider-sync-gates';
import { DecryptCircuitBreaker } from '@/lib/cron/decrypt-circuit-breaker';
import { summarizeCronSyncResults, type CronAthleteSyncResult } from '@/lib/cron/sync-summary';
import {
  isDecryptAuthenticitySoftFailure,
  isDecryptMalformedSoftFailure,
  isProviderAuthFailure,
} from '@/lib/integrations/shared/connection-status';

export const maxDuration = 300;

/** Bounded concurrency across athletes — each provider call is already rate-limit-aware per account. */
const ATHLETE_CONCURRENCY = 3;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

type AthleteSyncResult = CronAthleteSyncResult & {
  importedTypes: string[];
  backfilledActivityIds: string[];
};

function syncErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function recordSyncError(input: {
  result: AthleteSyncResult;
  provider: string;
  athleteId: string;
  error: unknown;
  fallback: string;
}) {
  const msg = syncErrorMessage(input.error, input.fallback);
  console.error(`[cron/sync] ${input.provider}:`, input.athleteId, msg);
  input.result.errors.push(`${input.provider}: ${msg}`);
}

function recordNeedsReconnect(input: {
  result: AthleteSyncResult;
  provider: string;
  athleteId: string;
  error: unknown;
}) {
  const msg = syncErrorMessage(input.error, 'needs reconnect');
  console.warn(`[cron/sync] ${input.provider} needs reconnect:`, input.athleteId, msg);
  if (!input.result.needsReconnect.includes(input.provider)) {
    input.result.needsReconnect.push(input.provider);
  }
}

function recordDecryptSkip(input: {
  result: AthleteSyncResult;
  provider: string;
  athleteId: string;
}) {
  console.error(
    `[cron/sync] ${input.provider}: decrypt authenticity failure (credentials preserved)`,
    input.athleteId,
  );
  input.result.decryptAuthenticity = true;
}

async function runProviderSync(input: {
  result: AthleteSyncResult;
  provider: string;
  athleteId: string;
  fallback: string;
  task: () => Promise<unknown>;
}) {
  try {
    await input.task();
    input.result.providerSyncCount += 1;
  } catch (error) {
    if (isDecryptAuthenticitySoftFailure(error)) {
      recordDecryptSkip(input);
      return;
    }
    if (isProviderAuthFailure(error) || isDecryptMalformedSoftFailure(error)) {
      recordNeedsReconnect({ ...input, error });
      return;
    }
    recordSyncError({ ...input, error });
  }
}

type ProviderSyncSpec = {
  provider: string;
  fallback: string;
  task: () => Promise<unknown>;
};

type ProviderAccounts = {
  strava: Awaited<ReturnType<typeof getStravaAccount>>;
  garmin: Awaited<ReturnType<typeof getGarminAccount>>;
  renpho: Awaited<ReturnType<typeof getRenphoAccount>>;
  withings: Awaited<ReturnType<typeof getWithingsAccount>>;
  google: Awaited<ReturnType<typeof getGoogleAccount>>;
  mfp: Awaited<ReturnType<typeof getMfpAccount>>;
};

function buildProviderSyncSpecs(
  athleteId: string,
  accounts: ProviderAccounts,
  result: AthleteSyncResult,
): ProviderSyncSpec[] {
  const specs: ProviderSyncSpec[] = [];
  if (shouldCronSyncProvider('strava', accounts.strava)) {
    specs.push({
      provider: 'Strava',
      fallback: 'Sync Strava échouée',
      task: async () => {
        const strava = await syncStravaActivities(athleteId);
        result.importedTypes.push(...strava.importedTypes);
      },
    });
  }
  if (shouldCronSyncProvider('garmin', accounts.garmin)) {
    specs.push({
      provider: 'Garmin',
      fallback: 'Sync Garmin échouée',
      task: () => syncGarminHealth(athleteId),
    });
    specs.push({
      provider: 'Garmin activities',
      fallback: 'Sync activités Garmin échouée',
      task: async () => {
        const activities = await syncGarminActivities(athleteId);
        result.importedTypes.push(...activities.importedTypes);
      },
    });
  }
  appendOptionalProviderSpecs(athleteId, accounts, specs);
  return specs;
}

function appendOptionalProviderSpecs(
  athleteId: string,
  accounts: ProviderAccounts,
  specs: ProviderSyncSpec[],
): void {
  if (shouldCronSyncProvider('withings', accounts.withings)) {
    specs.push({
      provider: 'Withings',
      fallback: 'Sync Withings échouée',
      task: () => syncWithingsHealth(athleteId),
    });
  }
  if (shouldCronSyncProvider('renpho', accounts.renpho)) {
    specs.push({
      provider: 'Renpho',
      fallback: 'Sync Renpho échouée',
      task: () => syncRenphoHealth(athleteId),
    });
  }
  if (shouldCronSyncProvider('google', accounts.google)) {
    specs.push({
      provider: 'Google',
      fallback: 'Sync Google échouée',
      task: () => syncFromGoogle(athleteId),
    });
  }
  if (shouldCronSyncProvider('myfitnesspal', accounts.mfp)) {
    specs.push({
      provider: 'MyFitnessPal',
      fallback: 'Sync MyFitnessPal échouée',
      task: () => syncMfpNutrition(athleteId),
    });
  }
}

async function syncConnectedProviders(
  athleteId: string,
  accounts: ProviderAccounts,
  result: AthleteSyncResult,
) {
  const specs = buildProviderSyncSpecs(athleteId, accounts, result);
  await Promise.all(
    specs.map((spec) =>
      runProviderSync({
        result,
        athleteId,
        provider: spec.provider,
        fallback: spec.fallback,
        task: spec.task,
      }),
    ),
  );
}

async function backfillStreamsIfNeeded(
  athleteId: string,
  accounts: ProviderAccounts,
  result: AthleteSyncResult,
) {
  if (
    !shouldCronSyncProvider('strava', accounts.strava) &&
    !shouldCronSyncProvider('garmin', accounts.garmin)
  ) {
    return;
  }
  try {
    const backfill = await backfillActivityStreams(athleteId, CRON_BACKFILL_BATCH);
    result.backfilledActivityIds = backfill.activityIdsWithData;
    await updateRecordsAfterProviderSync(athleteId, {
      importedTypes: result.importedTypes as never[],
      backfilledActivityIds: backfill.activityIdsWithData,
    });
  } catch (error) {
    recordSyncError({
      result,
      provider: 'backfill',
      athleteId,
      error,
      fallback: 'Backfill streams échoué',
    });
  }
}

async function refreshAthleteBriefing(athleteId: string, result: AthleteSyncResult) {
  try {
    await refreshAthleteState(athleteId, { skipSync: true, source: 'cron' });
    result.briefing = true;
  } catch (error) {
    recordSyncError({
      result,
      provider: 'athleteState',
      athleteId,
      error,
      fallback: 'Mise à jour état athlète échouée',
    });
  }
}

async function generateWeeklyReviewIfSunday(athleteId: string, result: AthleteSyncResult) {
  if (!isCoachConfigured() || !isSunday()) {
    return;
  }
  try {
    await generateAndStoreWeeklyReview(athleteId, new Date(), { current: true });
    result.weeklyReview = true;
  } catch (error) {
    recordSyncError({
      result,
      provider: 'weeklyReview',
      athleteId,
      error,
      fallback: 'Génération de la rétro hebdo échouée',
    });
  }
}

function emptyAthleteResult(athleteId: string): AthleteSyncResult {
  return {
    athleteId,
    providerSyncCount: 0,
    briefing: false,
    weeklyReview: false,
    errors: [],
    needsReconnect: [],
    decryptAuthenticity: false,
    skippedByCircuitBreaker: false,
    importedTypes: [],
    backfilledActivityIds: [],
  };
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

  const [strava, garmin, renpho, withings, google, mfp] = await Promise.all([
    getStravaAccount(athleteId),
    getGarminAccount(athleteId),
    getRenphoAccount(athleteId),
    getWithingsAccount(athleteId),
    getGoogleAccount(athleteId),
    getMfpAccount(athleteId),
  ]);
  const accounts: ProviderAccounts = { strava, garmin, renpho, withings, google, mfp };

  await syncConnectedProviders(athleteId, accounts, result);
  breaker.recordAthleteProcessed({ authenticityFailure: result.decryptAuthenticity });

  if (breaker.isTripped()) {
    // Stop further credential-mutating / heavy work for this athlete once tripped mid-flight.
    return result;
  }

  await backfillStreamsIfNeeded(athleteId, accounts, result);
  await refreshAthleteBriefing(athleteId, result);
  await generateWeeklyReviewIfSunday(athleteId, result);

  return result;
}

/** Synchro planifiée (Vercel Cron) : providers connectés, pour chaque athlète. */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return unauthorized();
  }

  const athletes = await prisma.athleteProfile.findMany({ select: { id: true } });
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
