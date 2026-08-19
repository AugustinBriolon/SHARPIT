import { Prisma } from '@prisma/client';
import { format, startOfDay, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { syncSinceFromLastSync, syncWindowDays } from '@/lib/integrations/sync-since';
import {
  clientFromTokens,
  currentTokens,
  garminTokensFromStorage,
  fetchAthleteThresholds,
  fetchDailyHealth,
  fetchWeightRange,
  loginWithCredentials,
  type GarminAthleteThresholds,
  type GarminDailyHealth,
} from '@/lib/integrations/garmin';
import { observationEngine } from '@/lib/engines/observation-engine';
import { garminHealthToObservations } from '@/core/adapters/garmin-health-adapter';
import {
  isGarminAccountConnected,
  isProviderAuthFailure,
  ProviderAuthError,
} from '@/lib/integrations/connection-status';
import { backfillHealthObservationsFromDailyHealth } from './health-observation-backfill';
import { mapWithConcurrency } from '@/lib/async/map-with-concurrency';

const ATHLETE_ID = 'default';

/** Cold open-path fallback when Garmin never synced — cron covers deeper history. */
export const GARMIN_HEALTH_OPEN_PATH_FALLBACK_DAYS = 14;
/** Default cold fallback for cron / manual incremental sync. */
export const GARMIN_HEALTH_DEFAULT_FALLBACK_DAYS = 60;
/** Parallel day fetches — keep modest to respect Garmin rate limits. */
export const GARMIN_HEALTH_DAY_CONCURRENCY = 4;

async function ingestGarminHealth(health: GarminDailyHealth, calendarDate: Date): Promise<void> {
  try {
    const raws = garminHealthToObservations(health, calendarDate, new Date());
    if (raws.length === 0) return;
    await observationEngine.ingestBatch(ATHLETE_ID, raws);
  } catch (err) {
    console.error('[ObservationEngine] garmin-health ingest failed:', err);
  }
}

const ACCOUNT_ID = 'default';

export async function getGarminAccount() {
  return prisma.garminAccount.findUnique({ where: { id: ACCOUNT_ID } });
}

/** Client Garmin authentifié (tokens en base). */
export async function getGarminClient() {
  const account = await getGarminAccount();
  if (!account || !isGarminAccountConnected(account)) {
    throw new ProviderAuthError('Session Garmin expirée. Reconnecte Garmin dans les paramètres.');
  }
  return clientFromTokens(garminTokensFromStorage(account.oauth1Token!, account.oauth2Token!));
}

export async function disconnectGarmin() {
  await prisma.garminAccount.deleteMany({ where: { id: ACCOUNT_ID } });
}

/** Keeps the Garmin profile row so the hub can ask for a reconnect. */
export async function revokeGarminCredentials() {
  const account = await getGarminAccount();
  if (!account) return;
  await prisma.garminAccount.update({
    where: { id: ACCOUNT_ID },
    data: { oauth1Token: {}, oauth2Token: {} },
  });
}

export async function runGarminCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isProviderAuthFailure(error)) {
      await revokeGarminCredentials();
      throw new ProviderAuthError('Session Garmin expirée. Reconnecte Garmin dans les paramètres.');
    }
    throw error;
  }
}

export async function connectGarmin(username: string, password: string) {
  const { tokens, profile } = await loginWithCredentials(username, password);

  await prisma.garminAccount.upsert({
    where: { id: ACCOUNT_ID },
    create: {
      id: ACCOUNT_ID,
      displayName: profile.displayName,
      fullName: profile.fullName,
      oauth1Token: tokens.oauth1 as unknown as Prisma.InputJsonValue,
      oauth2Token: tokens.oauth2 as unknown as Prisma.InputJsonValue,
    },
    update: {
      displayName: profile.displayName,
      fullName: profile.fullName,
      oauth1Token: tokens.oauth1 as unknown as Prisma.InputJsonValue,
      oauth2Token: tokens.oauth2 as unknown as Prisma.InputJsonValue,
    },
  });

  return profile;
}

export interface GarminThresholdsImport extends GarminAthleteThresholds {
  imported: boolean;
}

/**
 * Importe les seuils de l'athlète depuis Garmin et les enregistre dans le
 * profil. Seuls les champs renvoyés par Garmin sont écrits (un champ absent ne
 * remplace pas une valeur existante).
 */
export async function importGarminThresholds(): Promise<GarminThresholdsImport> {
  return runGarminCall(async () => {
    const account = await getGarminAccount();
    if (!account || !isGarminAccountConnected(account)) {
      throw new ProviderAuthError('Session Garmin expirée. Reconnecte Garmin dans les paramètres.');
    }

    const client = clientFromTokens(
      garminTokensFromStorage(account.oauth1Token!, account.oauth2Token!),
    );

    const thresholds = await fetchAthleteThresholds(client);

    // Only claim a sync happened when every source answered. A partial import that
    // stamps the timestamp is how this app spent months reporting "synced" with
    // ftpW, maxHr and lthr all null.
    const data: Prisma.AthleteProfileUncheckedUpdateInput =
      thresholds.failedSources.length === 0 ? { thresholdsSyncedAt: new Date() } : {};
    if (thresholds.ftpW != null) data.ftpW = thresholds.ftpW;
    if (thresholds.maxHr != null) data.maxHr = thresholds.maxHr;
    if (thresholds.lthr != null) data.lthr = thresholds.lthr;
    if (thresholds.runThresholdPaceSecPerKm != null)
      data.runThresholdPaceSecPerKm = thresholds.runThresholdPaceSecPerKm;
    if (thresholds.vo2maxRunning != null) data.vo2maxRunning = thresholds.vo2maxRunning;
    if (thresholds.vo2maxCycling != null) data.vo2maxCycling = thresholds.vo2maxCycling;

    await prisma.athleteProfile.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...data } as Prisma.AthleteProfileUncheckedCreateInput,
      update: data,
    });

    const refreshed = currentTokens(client);
    await prisma.garminAccount.update({
      where: { id: ACCOUNT_ID },
      data: {
        oauth1Token: refreshed.oauth1 as unknown as Prisma.InputJsonValue,
        oauth2Token: refreshed.oauth2 as unknown as Prisma.InputJsonValue,
      },
    });

    const imported =
      thresholds.ftpW != null ||
      thresholds.maxHr != null ||
      thresholds.lthr != null ||
      thresholds.runThresholdPaceSecPerKm != null ||
      thresholds.vo2maxRunning != null ||
      thresholds.vo2maxCycling != null;

    return { ...thresholds, imported };
  });
}

export interface GarminSyncResult {
  days: number;
  updated: number;
  emptyDays: number;
  observationsBackfilled?: number;
}

function healthHasData(health: GarminDailyHealth): boolean {
  return (
    health.sleepMinutes != null ||
    health.napMinutes != null ||
    health.restingHr != null ||
    health.hrv != null ||
    health.weightKg != null ||
    health.readinessScore != null ||
    health.hrvStatus != null ||
    health.stress != null ||
    health.bodyBattery != null ||
    health.totalSteps != null ||
    health.sleep.sleepScore != null
  );
}

async function upsertGarminHealthDay(
  client: Awaited<ReturnType<typeof clientFromTokens>>,
  date: Date,
  weightKg: number | null,
): Promise<'updated' | 'empty'> {
  const health = await fetchDailyHealth(client, date, weightKg);
  if (!healthHasData(health)) return 'empty';

  // Le champ DailyHealth.date est un `@db.Date` : Postgres ne garde que la
  // partie calendaire et la tronque en UTC. Si on passe un minuit LOCAL
  // (Europe/Paris = UTC+2), le 29/06 00:00 local devient 28/06 22:00 UTC et
  // serait stocké au 28/06. On construit donc un minuit UTC à partir des
  // composantes LOCALES pour stocker le bon jour, quel que soit le fuseau
  // du serveur (local en dev, UTC sur Vercel).
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const factors =
    health.readinessFactors != null
      ? (health.readinessFactors as unknown as Prisma.InputJsonValue)
      : undefined;

  const data: Prisma.DailyHealthUpdateInput = {};
  if (health.sleepMinutes != null) data.sleepMinutes = health.sleepMinutes;
  if (health.napMinutes != null) data.napMinutes = health.napMinutes;
  if (health.restingHr != null) data.restingHr = health.restingHr;
  if (health.hrv != null) data.hrv = health.hrv;
  if (health.weightKg != null) data.weightKg = health.weightKg;
  if (health.readinessScore != null) data.recoveryScore = health.readinessScore;
  if (health.readinessLevel != null) data.readinessLevel = health.readinessLevel;
  if (health.readinessFeedback != null) data.readinessFeedback = health.readinessFeedback;
  if (factors != null) data.readinessFactors = factors;
  if (health.hrvStatus != null) data.hrvStatus = health.hrvStatus;
  if (health.hrvBaselineLow != null) data.hrvBaselineLow = health.hrvBaselineLow;
  if (health.hrvBaselineHigh != null) data.hrvBaselineHigh = health.hrvBaselineHigh;
  if (health.stress != null) data.stress = health.stress;
  if (health.bodyBattery != null) data.bodyBattery = health.bodyBattery;
  if (health.totalSteps != null) data.totalSteps = health.totalSteps;
  const { sleep } = health;
  if (sleep.sleepScore != null) data.sleepScore = sleep.sleepScore;
  if (sleep.sleepDeepMin != null) data.sleepDeepMin = sleep.sleepDeepMin;
  if (sleep.sleepLightMin != null) data.sleepLightMin = sleep.sleepLightMin;
  if (sleep.sleepRemMin != null) data.sleepRemMin = sleep.sleepRemMin;
  if (sleep.sleepAwakeMin != null) data.sleepAwakeMin = sleep.sleepAwakeMin;
  if (sleep.sleepBedtimeMin != null) data.sleepBedtimeMin = sleep.sleepBedtimeMin;
  if (sleep.sleepWakeMin != null) data.sleepWakeMin = sleep.sleepWakeMin;
  if (sleep.sleepRespiration != null) data.sleepRespiration = sleep.sleepRespiration;
  if (sleep.sleepAvgStress != null) data.sleepAvgStress = sleep.sleepAvgStress;
  if (sleep.sleepScoreFeedback != null) data.sleepScoreFeedback = sleep.sleepScoreFeedback;

  await prisma.dailyHealth.upsert({
    where: { date: day },
    create: {
      date: day,
      sleepMinutes: health.sleepMinutes,
      napMinutes: health.napMinutes,
      restingHr: health.restingHr,
      hrv: health.hrv,
      weightKg: health.weightKg,
      recoveryScore: health.readinessScore,
      readinessLevel: health.readinessLevel,
      readinessFeedback: health.readinessFeedback,
      readinessFactors: factors,
      hrvStatus: health.hrvStatus,
      hrvBaselineLow: health.hrvBaselineLow,
      hrvBaselineHigh: health.hrvBaselineHigh,
      stress: health.stress,
      bodyBattery: health.bodyBattery,
      totalSteps: health.totalSteps,
      sleepScore: sleep.sleepScore,
      sleepDeepMin: sleep.sleepDeepMin,
      sleepLightMin: sleep.sleepLightMin,
      sleepRemMin: sleep.sleepRemMin,
      sleepAwakeMin: sleep.sleepAwakeMin,
      sleepBedtimeMin: sleep.sleepBedtimeMin,
      sleepWakeMin: sleep.sleepWakeMin,
      sleepRespiration: sleep.sleepRespiration,
      sleepAvgStress: sleep.sleepAvgStress,
      sleepScoreFeedback: sleep.sleepScoreFeedback,
    },
    update: data,
  });
  await ingestGarminHealth(health, day);
  return 'updated';
}

export async function syncGarminHealth(options?: {
  days?: number;
  full?: boolean;
}): Promise<GarminSyncResult> {
  return runGarminCall(async () => {
    const account = await getGarminAccount();
    if (!account || !isGarminAccountConnected(account)) {
      throw new ProviderAuthError('Session Garmin expirée. Reconnecte Garmin dans les paramètres.');
    }

    const client = clientFromTokens(
      garminTokensFromStorage(account.oauth1Token, account.oauth2Token),
    );

    const fallbackDays = options?.days ?? GARMIN_HEALTH_DEFAULT_FALLBACK_DAYS;
    const today = startOfDay(new Date());
    const since = options?.full
      ? subDays(today, 365)
      : syncSinceFromLastSync(account.lastSyncAt, fallbackDays);
    const days = syncWindowDays(since);

    const weightMap = await fetchWeightRange(client, since, today);

    const dates: Date[] = [];
    for (let date = today; date >= since; date = subDays(date, 1)) {
      dates.push(date);
    }

    const outcomes = await mapWithConcurrency(
      dates,
      GARMIN_HEALTH_DAY_CONCURRENCY,
      async (date) => {
        const weightKg = weightMap.get(format(date, 'yyyy-MM-dd')) ?? null;
        return upsertGarminHealthDay(client, date, weightKg);
      },
    );

    const updated = outcomes.filter((o) => o === 'updated').length;
    const emptyDays = outcomes.filter((o) => o === 'empty').length;

    const refreshed = currentTokens(client);
    await prisma.garminAccount.update({
      where: { id: ACCOUNT_ID },
      data: {
        oauth1Token: refreshed.oauth1 as unknown as Prisma.InputJsonValue,
        oauth2Token: refreshed.oauth2 as unknown as Prisma.InputJsonValue,
        lastSyncAt: new Date(),
      },
    });

    const backfill = await backfillHealthObservationsFromDailyHealth(ATHLETE_ID, {
      days: options?.full ? 365 : fallbackDays,
    });

    return { days, updated, emptyDays, observationsBackfilled: backfill.ingested };
  });
}
