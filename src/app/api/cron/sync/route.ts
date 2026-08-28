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
import { timingSafeEqualString } from '@/lib/crypto/timing-safe-equal';

export const maxDuration = 300;

/** Bounded concurrency across athletes — each provider call is already rate-limit-aware per account. */
const ATHLETE_CONCURRENCY = 3;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

type AthleteSyncResult = {
  athleteId: string;
  strava: Awaited<ReturnType<typeof syncStravaActivities>> | null;
  garmin: Awaited<ReturnType<typeof syncGarminHealth>> | null;
  garminActivities: Awaited<ReturnType<typeof syncGarminActivities>> | null;
  renpho: Awaited<ReturnType<typeof syncRenphoHealth>> | null;
  withings: Awaited<ReturnType<typeof syncWithingsHealth>> | null;
  google: Awaited<ReturnType<typeof syncFromGoogle>> | null;
  mfp: Awaited<ReturnType<typeof syncMfpNutrition>> | null;
  backfill: Awaited<ReturnType<typeof backfillActivityStreams>> | null;
  briefing: boolean;
  weeklyReview: boolean;
  errors: string[];
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

async function runProviderSync<T>(input: {
  result: AthleteSyncResult;
  provider: string;
  athleteId: string;
  fallback: string;
  assign: (value: T) => void;
  task: () => Promise<T>;
}) {
  try {
    input.assign(await input.task());
  } catch (error) {
    recordSyncError({ ...input, error });
  }
}

type ProviderSyncSpec = {
  provider: string;
  fallback: string;
  assign: (value: unknown) => void;
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
  if (accounts.strava) {
    specs.push({
      provider: 'Strava',
      fallback: 'Sync Strava échouée',
      assign: (value) => {
        result.strava = value as AthleteSyncResult['strava'];
      },
      task: () => syncStravaActivities(athleteId),
    });
  }
  if (accounts.garmin) {
    specs.push({
      provider: 'Garmin',
      fallback: 'Sync Garmin échouée',
      assign: (value) => {
        result.garmin = value as AthleteSyncResult['garmin'];
      },
      task: () => syncGarminHealth(athleteId),
    });
    specs.push({
      provider: 'Garmin activities',
      fallback: 'Sync activités Garmin échouée',
      assign: (value) => {
        result.garminActivities = value as AthleteSyncResult['garminActivities'];
      },
      task: () => syncGarminActivities(athleteId),
    });
  }
  if (accounts.withings) {
    specs.push({
      provider: 'Withings',
      fallback: 'Sync Withings échouée',
      assign: (value) => {
        result.withings = value as AthleteSyncResult['withings'];
      },
      task: () => syncWithingsHealth(athleteId),
    });
  }
  if (accounts.renpho) {
    specs.push({
      provider: 'Renpho',
      fallback: 'Sync Renpho échouée',
      assign: (value) => {
        result.renpho = value as AthleteSyncResult['renpho'];
      },
      task: () => syncRenphoHealth(athleteId),
    });
  }
  if (accounts.google?.targetCalendarId) {
    specs.push({
      provider: 'Google',
      fallback: 'Sync Google échouée',
      assign: (value) => {
        result.google = value as AthleteSyncResult['google'];
      },
      task: () => syncFromGoogle(athleteId),
    });
  }
  if (accounts.mfp) {
    specs.push({
      provider: 'MyFitnessPal',
      fallback: 'Sync MyFitnessPal échouée',
      assign: (value) => {
        result.mfp = value as AthleteSyncResult['mfp'];
      },
      task: () => syncMfpNutrition(athleteId),
    });
  }
  return specs;
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
        assign: spec.assign,
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
  if (!accounts.strava && !accounts.garmin) {
    return;
  }
  try {
    result.backfill = await backfillActivityStreams(athleteId, CRON_BACKFILL_BATCH);
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

async function updateRecordsIfNeeded(
  athleteId: string,
  accounts: ProviderAccounts,
  result: AthleteSyncResult,
) {
  if (!accounts.strava && !accounts.garmin) {
    return;
  }
  const importedTypes = [
    ...(result.strava?.importedTypes ?? []),
    ...(result.garminActivities?.importedTypes ?? []),
  ];
  await updateRecordsAfterProviderSync(athleteId, {
    importedTypes,
    backfilledActivityIds: result.backfill?.activityIdsWithData,
  });
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

async function syncOneAthlete(athleteId: string): Promise<AthleteSyncResult> {
  const result: AthleteSyncResult = {
    athleteId,
    strava: null,
    garmin: null,
    garminActivities: null,
    renpho: null,
    withings: null,
    google: null,
    mfp: null,
    backfill: null,
    briefing: false,
    weeklyReview: false,
    errors: [],
  };

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
  await backfillStreamsIfNeeded(athleteId, accounts, result);
  await updateRecordsIfNeeded(athleteId, accounts, result);
  await refreshAthleteBriefing(athleteId, result);
  await generateWeeklyReviewIfSunday(athleteId, result);

  return result;
}

/** Synchro planifiée (Vercel Cron) : Strava, Garmin, Renpho, Withings, Google, MyFitnessPal si connectés, pour chaque athlète. */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (!auth || !timingSafeEqualString(auth, `Bearer ${process.env.CRON_SECRET}`)) {
    return unauthorized();
  }

  const athletes = await prisma.athleteProfile.findMany({ select: { id: true } });

  const results = await mapWithConcurrency(athletes, ATHLETE_CONCURRENCY, (athlete) =>
    syncOneAthlete(athlete.id),
  );

  return NextResponse.json({
    ok: results.every((r) => r.errors.length === 0),
    athletes: results,
  });
}
