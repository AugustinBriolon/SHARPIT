import { NextResponse } from 'next/server';
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

export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Synchro planifiée (Vercel Cron) : Strava, Garmin, Renpho, Withings, Google, MyFitnessPal si connectés. */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return unauthorized();
  }

  const result: {
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
  } = {
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

  const [stravaAccount, garminAccount, renphoAccount, withingsAccount, googleAccount, mfpAccount] =
    await Promise.all([
      getStravaAccount(),
      getGarminAccount(),
      getRenphoAccount(),
      getWithingsAccount(),
      getGoogleAccount(),
      getMfpAccount(),
    ]);

  // All connected providers in parallel — each failure is isolated into result.errors.
  await Promise.all([
    stravaAccount
      ? syncStravaActivities()
          .then((strava) => {
            result.strava = strava;
          })
          .catch((error) => {
            const msg = error instanceof Error ? error.message : 'Sync Strava échouée';
            console.error('[cron/sync] Strava:', msg);
            result.errors.push(`strava: ${msg}`);
          })
      : Promise.resolve(),
    // 7 days is enough for the daily cron (data already in DB).
    garminAccount
      ? syncGarminHealth()
          .then((garmin) => {
            result.garmin = garmin;
          })
          .catch((error) => {
            const msg = error instanceof Error ? error.message : 'Sync Garmin échouée';
            console.error('[cron/sync] Garmin:', msg);
            result.errors.push(`garmin: ${msg}`);
          })
      : Promise.resolve(),
    garminAccount
      ? syncGarminActivities()
          .then((garminActivities) => {
            result.garminActivities = garminActivities;
          })
          .catch((error) => {
            const msg = error instanceof Error ? error.message : 'Sync activités Garmin échouée';
            console.error('[cron/sync] Garmin activities:', msg);
            result.errors.push(`garminActivities: ${msg}`);
          })
      : Promise.resolve(),
    withingsAccount
      ? syncWithingsHealth()
          .then((withings) => {
            result.withings = withings;
          })
          .catch((error) => {
            const msg = error instanceof Error ? error.message : 'Sync Withings échouée';
            console.error('[cron/sync] Withings:', msg);
            result.errors.push(`withings: ${msg}`);
          })
      : Promise.resolve(),
    renphoAccount
      ? syncRenphoHealth()
          .then((renpho) => {
            result.renpho = renpho;
          })
          .catch((error) => {
            const msg = error instanceof Error ? error.message : 'Sync Renpho échouée';
            console.error('[cron/sync] Renpho:', msg);
            result.errors.push(`renpho: ${msg}`);
          })
      : Promise.resolve(),
    googleAccount?.targetCalendarId
      ? syncFromGoogle()
          .then((google) => {
            result.google = google;
          })
          .catch((error) => {
            const msg = error instanceof Error ? error.message : 'Sync Google échouée';
            console.error('[cron/sync] Google:', msg);
            result.errors.push(`google: ${msg}`);
          })
      : Promise.resolve(),
    mfpAccount
      ? syncMfpNutrition()
          .then((mfp) => {
            result.mfp = mfp;
          })
          .catch((error) => {
            const msg = error instanceof Error ? error.message : 'Sync MyFitnessPal échouée';
            console.error('[cron/sync] MyFitnessPal:', msg);
            result.errors.push(`mfp: ${msg}`);
          })
      : Promise.resolve(),
  ]);

  // Backfill progressif des streams (records & courbes) : un lot par exécution
  // pour rester sous le rate-limit Strava.
  if (stravaAccount || garminAccount) {
    try {
      result.backfill = await backfillActivityStreams(CRON_BACKFILL_BATCH);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Backfill streams échoué';
      console.error('[cron/sync] Backfill:', msg);
      result.errors.push(`backfill: ${msg}`);
    }
  }

  if (stravaAccount || garminAccount) {
    const importedTypes = [
      ...(result.strava?.importedTypes ?? []),
      ...(result.garminActivities?.importedTypes ?? []),
    ];
    await updateRecordsAfterProviderSync({
      importedTypes,
      backfilledActivityIds: result.backfill?.activityIdsWithData,
    });
  }

  // Inference + briefing background after sync (athlete state orchestrator).
  try {
    await refreshAthleteState({ skipSync: true, source: 'cron' });
    result.briefing = true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Mise à jour état athlète échouée';
    console.error('[cron/sync] athlete-state:', msg);
    result.errors.push(`athleteState: ${msg}`);
  }

  // Rétro hebdo : le dimanche uniquement.
  if (isCoachConfigured() && isSunday()) {
    try {
      await generateAndStoreWeeklyReview(new Date(), { current: true });
      result.weeklyReview = true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Génération de la rétro hebdo échouée';
      console.error('[cron/sync] WeeklyReview:', msg);
      result.errors.push(`weeklyReview: ${msg}`);
    }
  }

  if (
    !stravaAccount &&
    !garminAccount &&
    !renphoAccount &&
    !withingsAccount &&
    !googleAccount?.targetCalendarId &&
    !mfpAccount
  ) {
    return NextResponse.json({
      ok: true,
      message: 'Aucune source connectée, rien à synchroniser.',
      ...result,
    });
  }

  return NextResponse.json({
    ok: result.errors.length === 0,
    ...result,
  });
}
