import { refreshAthleteState } from '@/lib/athlete-state/orchestrator';
import { getGarminAccount, syncGarminHealth } from '@/lib/integrations/garmin/garmin-sync';
import { syncGarminActivities } from '@/lib/integrations/garmin/garmin-activity-sync';
import { getGoogleAccount, syncFromGoogle } from '@/lib/integrations/google/google-sync';
import { getMfpAccount, syncMfpNutrition } from '@/lib/integrations/myfitnesspal/myfitnesspal-sync';
import { updateRecordsAfterProviderSync } from '@/lib/training/records/records';
import { getRenphoAccount, syncRenphoHealth } from '@/lib/integrations/renpho/renpho-sync';
import { getWithingsAccount, syncWithingsHealth } from '@/lib/integrations/withings/withings-sync';
import { CRON_BACKFILL_BATCH, backfillActivityStreams } from '@/lib/streams/stream-backfill';
import { getStravaAccount, syncStravaActivities } from '@/lib/integrations/strava/strava-sync';
import { generateAndStoreWeeklyReview, isSunday } from '@/lib/coach/weekly-review';
import { isCoachConfigured } from '@/lib/ai';
import { listConnectedCronProviders } from '@/lib/cron/list-connected-cron-providers';
import type { CronAthleteSyncResult } from '@/lib/cron/sync-summary';
import {
  isDecryptAuthenticitySoftFailure,
  isDecryptMalformedSoftFailure,
  isProviderAuthFailure,
} from '@/lib/integrations/shared/connection-status';
import {
  athleteHasAiProcessingConsent,
  athleteHasHealthDataConsent,
} from '@/lib/privacy/consent-store';

/**
 * Pulling one athlete's connected providers and rebuilding their state — shared by the
 * scheduled sync (`/api/cron/sync`) and the on-demand one the native app starts
 * (`/api/v1/sync`), so both refresh the same data the same way.
 */

export type AthleteSyncResult = CronAthleteSyncResult & {
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
  console.error(`[sync] ${input.provider}:`, input.athleteId, msg);
  input.result.errors.push(`${input.provider}: ${msg}`);
}

function recordNeedsReconnect(input: {
  result: AthleteSyncResult;
  provider: string;
  athleteId: string;
  error: unknown;
}) {
  const msg = syncErrorMessage(input.error, 'needs reconnect');
  console.warn(`[sync] ${input.provider} needs reconnect:`, input.athleteId, msg);
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
    `[sync] ${input.provider}: decrypt authenticity failure (credentials preserved)`,
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

export type ProviderAccounts = {
  strava: Awaited<ReturnType<typeof getStravaAccount>>;
  garmin: Awaited<ReturnType<typeof getGarminAccount>>;
  renpho: Awaited<ReturnType<typeof getRenphoAccount>>;
  withings: Awaited<ReturnType<typeof getWithingsAccount>>;
  google: Awaited<ReturnType<typeof getGoogleAccount>>;
  mfp: Awaited<ReturnType<typeof getMfpAccount>>;
};

function connectedProviderSet(accounts: ProviderAccounts): Set<string> {
  return new Set(
    listConnectedCronProviders({
      strava: accounts.strava,
      garmin: accounts.garmin,
      withings: accounts.withings,
      renpho: accounts.renpho,
      google: accounts.google,
      myfitnesspal: accounts.mfp,
    }),
  );
}

function buildProviderSyncSpecs(
  athleteId: string,
  accounts: ProviderAccounts,
  result: AthleteSyncResult,
  options: { hasHealthConsent: boolean },
): ProviderSyncSpec[] {
  const connected = connectedProviderSet(accounts);
  const specs: ProviderSyncSpec[] = [];
  if (connected.has('strava')) {
    specs.push({
      provider: 'Strava',
      fallback: 'Sync Strava échouée',
      task: async () => {
        const strava = await syncStravaActivities(athleteId);
        result.importedTypes.push(...strava.importedTypes);
      },
    });
  }
  if (connected.has('garmin') && options.hasHealthConsent) {
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
  appendOptionalProviderSpecs(athleteId, connected, specs, options);
  return specs;
}

function appendOptionalProviderSpecs(
  athleteId: string,
  connected: Set<string>,
  specs: ProviderSyncSpec[],
  options: { hasHealthConsent: boolean },
): void {
  if (connected.has('withings') && options.hasHealthConsent) {
    specs.push({
      provider: 'Withings',
      fallback: 'Sync Withings échouée',
      task: () => syncWithingsHealth(athleteId),
    });
  }
  if (connected.has('renpho') && options.hasHealthConsent) {
    specs.push({
      provider: 'Renpho',
      fallback: 'Sync Renpho échouée',
      task: () => syncRenphoHealth(athleteId),
    });
  }
  if (connected.has('google')) {
    specs.push({
      provider: 'Google',
      fallback: 'Sync Google échouée',
      task: () => syncFromGoogle(athleteId),
    });
  }
  if (connected.has('myfitnesspal') && options.hasHealthConsent) {
    specs.push({
      provider: 'MyFitnessPal',
      fallback: 'Sync MyFitnessPal échouée',
      task: () => syncMfpNutrition(athleteId),
    });
  }
}

export async function syncConnectedProviders(
  athleteId: string,
  accounts: ProviderAccounts,
  result: AthleteSyncResult,
  options: { hasHealthConsent: boolean },
) {
  const specs = buildProviderSyncSpecs(athleteId, accounts, result, options);
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

export async function backfillStreamsIfNeeded(
  athleteId: string,
  accounts: ProviderAccounts,
  result: AthleteSyncResult,
) {
  const connected = connectedProviderSet(accounts);
  if (!connected.has('strava') && !connected.has('garmin')) {
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

export async function refreshAthleteBriefing(athleteId: string, result: AthleteSyncResult) {
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

export async function generateWeeklyReviewIfSunday(athleteId: string, result: AthleteSyncResult) {
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

export function emptyAthleteResult(athleteId: string): AthleteSyncResult {
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

/** The athlete's provider accounts and consents, read once for a sync. */
export async function loadAthleteSyncContext(athleteId: string) {
  const [strava, garmin, renpho, withings, google, mfp, hasHealthConsent, hasAiConsent] =
    await Promise.all([
      getStravaAccount(athleteId),
      getGarminAccount(athleteId),
      getRenphoAccount(athleteId),
      getWithingsAccount(athleteId),
      getGoogleAccount(athleteId),
      getMfpAccount(athleteId),
      athleteHasHealthDataConsent(athleteId),
      athleteHasAiProcessingConsent(athleteId),
    ]);
  const accounts: ProviderAccounts = { strava, garmin, renpho, withings, google, mfp };
  return { accounts, hasHealthConsent, hasAiConsent };
}

export { connectedProviderSet };
