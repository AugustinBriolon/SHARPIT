import { Prisma } from '@prisma/client';
import { format, startOfDay, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { syncSinceFromLastSync, syncWindowDays } from '@/lib/integrations/shared/sync-since';
import {
  clientFromTokens,
  currentTokens,
  diGarminTokensExpiresAtMs,
  garminTokensFromStorage,
  fetchAthleteThresholds,
  fetchDailyHealth,
  fetchWeightRange,
  isDiGarminTokens,
  loginWithCredentials,
  refreshDiGarminTokens,
  type GarminAthleteThresholds,
  type GarminDailyHealth,
} from '@/lib/integrations/garmin/garmin';
import { observationEngine } from '@/lib/engines/observation-engine';
import { garminHealthToObservations } from '@/core/adapters/garmin-health-adapter';
import {
  isGarminAccountConnected,
  isProviderAuthFailure,
  ProviderAuthError,
} from '@/lib/integrations/shared/connection-status';
import { backfillHealthObservationsFromDailyHealth } from '../shared/health-observation-backfill';
import { mapWithConcurrency } from '@/lib/async/map-with-concurrency';
import { decryptSecret, encryptSecret } from '@/lib/secret-box';
import type { GarminTokens } from '@/lib/integrations/garmin/garmin';

/** Encrypts one OAuth token object for storage in the `*TokenEnc` columns. */
export function encryptGarminToken(token: unknown): string {
  return encryptSecret(JSON.stringify(token));
}

/** Reverses `encryptGarminToken` — reads a stored `*TokenEnc` column back into tokens. */
export function decryptGarminTokens(oauth1Enc: string, oauth2Enc: string): GarminTokens {
  return garminTokensFromStorage(
    JSON.parse(decryptSecret(oauth1Enc)),
    JSON.parse(decryptSecret(oauth2Enc)),
  );
}

/** Cold open-path fallback when Garmin never synced — cron covers deeper history. */
export const GARMIN_HEALTH_OPEN_PATH_FALLBACK_DAYS = 14;
/** Default cold fallback for cron / manual incremental sync. */
export const GARMIN_HEALTH_DEFAULT_FALLBACK_DAYS = 60;
/** Parallel day fetches — keep modest to respect Garmin rate limits. */
export const GARMIN_HEALTH_DAY_CONCURRENCY = 4;

async function ingestGarminHealth(
  athleteId: string,
  health: GarminDailyHealth,
  calendarDate: Date,
): Promise<void> {
  try {
    const raws = garminHealthToObservations(health, calendarDate, new Date());
    if (raws.length === 0) {
      return;
    }
    await observationEngine.ingestBatch(athleteId, raws);
  } catch (err) {
    console.error('[ObservationEngine] garmin-health ingest failed:', err);
  }
}

export async function getGarminAccount(athleteId: string) {
  return prisma.garminAccount.findUnique({ where: { athleteId } });
}

/** Refresh a stored DI (mobile-fallback) token once it's close to expiry. */
const DI_REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * Decrypts an account's stored tokens into a ready-to-use client, refreshing
 * first if they came from the mobile DI fallback and are close to expiry.
 *
 * That proactive check matters: `@flow-js/garmin-connect`'s own client retries
 * a 401 by calling its internal oauth1→oauth2 exchange, which is the same
 * endpoint the DI fallback exists to avoid. Refreshing here, before that can
 * fire, keeps a DI-authenticated account from silently falling back into the
 * blocked exchange mid-sync.
 */
export async function buildFreshGarminClient(
  athleteId: string,
  account: { oauth1TokenEnc: string; oauth2TokenEnc: string },
) {
  let tokens = decryptGarminTokens(account.oauth1TokenEnc, account.oauth2TokenEnc);
  if (
    isDiGarminTokens(tokens) &&
    diGarminTokensExpiresAtMs(tokens) - Date.now() < DI_REFRESH_MARGIN_MS
  ) {
    try {
      tokens = await refreshDiGarminTokens(tokens);
    } catch (error) {
      await revokeGarminCredentials(athleteId);
      throw new ProviderAuthError(
        'Session Garmin expirée. Reconnecte Garmin dans les paramètres.',
        {
          cause: error,
        },
      );
    }
    await prisma.garminAccount.update({
      where: { athleteId },
      data: {
        oauth1TokenEnc: encryptGarminToken(tokens.oauth1),
        oauth2TokenEnc: encryptGarminToken(tokens.oauth2),
      },
    });
  }
  return clientFromTokens(tokens);
}

/** Client Garmin authentifié (tokens en base). */
export async function getGarminClient(athleteId: string) {
  const account = await getGarminAccount(athleteId);
  if (!account || !isGarminAccountConnected(account)) {
    throw new ProviderAuthError('Session Garmin expirée. Reconnecte Garmin dans les paramètres.');
  }
  return buildFreshGarminClient(athleteId, account);
}

export async function disconnectGarmin(athleteId: string) {
  await prisma.garminAccount.deleteMany({ where: { athleteId } });
}

/** Keeps the Garmin profile row so the hub can ask for a reconnect. */
export async function revokeGarminCredentials(athleteId: string) {
  const account = await getGarminAccount(athleteId);
  if (!account) {
    return;
  }
  await prisma.garminAccount.update({
    where: { athleteId },
    data: { oauth1TokenEnc: '', oauth2TokenEnc: '' },
  });
}

export async function runGarminCall<T>(athleteId: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isProviderAuthFailure(error)) {
      await revokeGarminCredentials(athleteId);
      throw new ProviderAuthError('Session Garmin expirée. Reconnecte Garmin dans les paramètres.');
    }
    throw error;
  }
}

export async function connectGarmin(athleteId: string, username: string, password: string) {
  const { tokens, profile } = await loginWithCredentials(username, password);

  await prisma.garminAccount.upsert({
    where: { athleteId },
    create: {
      athleteId,
      displayName: profile.displayName,
      fullName: profile.fullName,
      oauth1TokenEnc: encryptGarminToken(tokens.oauth1),
      oauth2TokenEnc: encryptGarminToken(tokens.oauth2),
    },
    update: {
      displayName: profile.displayName,
      fullName: profile.fullName,
      oauth1TokenEnc: encryptGarminToken(tokens.oauth1),
      oauth2TokenEnc: encryptGarminToken(tokens.oauth2),
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
export async function importGarminThresholds(athleteId: string): Promise<GarminThresholdsImport> {
  return runGarminCall(athleteId, async () => {
    const account = await getGarminAccount(athleteId);
    if (!account || !isGarminAccountConnected(account)) {
      throw new ProviderAuthError('Session Garmin expirée. Reconnecte Garmin dans les paramètres.');
    }

    const client = await buildFreshGarminClient(athleteId, account);

    const thresholds = await fetchAthleteThresholds(client);

    // Only claim a sync happened when every source answered. A partial import that
    // stamps the timestamp is how this app spent months reporting "synced" with
    // ftpW, maxHr and lthr all null.
    const data: Prisma.AthleteProfileUncheckedUpdateInput =
      thresholds.failedSources.length === 0 ? { thresholdsSyncedAt: new Date() } : {};
    if (thresholds.ftpW !== null) {
      data.ftpW = thresholds.ftpW;
    }
    if (thresholds.maxHr !== null) {
      data.maxHr = thresholds.maxHr;
    }
    if (thresholds.lthr !== null) {
      data.lthr = thresholds.lthr;
    }
    if (thresholds.runThresholdPaceSecPerKm !== null) {
      data.runThresholdPaceSecPerKm = thresholds.runThresholdPaceSecPerKm;
    }
    if (thresholds.vo2maxRunning !== null) {
      data.vo2maxRunning = thresholds.vo2maxRunning;
    }
    if (thresholds.vo2maxCycling !== null) {
      data.vo2maxCycling = thresholds.vo2maxCycling;
    }

    // The migrated profile row always exists — see the same note in
    // `upsertAthleteProfile` (src/lib/queries/index.ts).
    await prisma.athleteProfile.update({
      where: { id: athleteId },
      data,
    });

    const refreshed = currentTokens(client);
    await prisma.garminAccount.update({
      where: { athleteId },
      data: {
        oauth1TokenEnc: encryptGarminToken(refreshed.oauth1),
        oauth2TokenEnc: encryptGarminToken(refreshed.oauth2),
      },
    });

    const imported =
      thresholds.ftpW !== null ||
      thresholds.maxHr !== null ||
      thresholds.lthr !== null ||
      thresholds.runThresholdPaceSecPerKm !== null ||
      thresholds.vo2maxRunning !== null ||
      thresholds.vo2maxCycling !== null;

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
    health.sleepMinutes !== null ||
    health.napMinutes !== null ||
    health.restingHr !== null ||
    health.hrv !== null ||
    health.weightKg !== null ||
    health.readinessScore !== null ||
    health.hrvStatus !== null ||
    health.stress !== null ||
    health.bodyBattery !== null ||
    health.totalSteps !== null ||
    health.sleep.sleepScore !== null
  );
}

async function upsertGarminHealthDay(
  athleteId: string,
  client: Awaited<ReturnType<typeof clientFromTokens>>,
  date: Date,
  weightKg: number | null,
): Promise<'updated' | 'empty'> {
  const health = await fetchDailyHealth(client, date, weightKg);
  if (!healthHasData(health)) {
    return 'empty';
  }

  // Le champ DailyHealth.date est un `@db.Date` : Postgres ne garde que la
  // partie calendaire et la tronque en UTC. Si on passe un minuit LOCAL
  // (Europe/Paris = UTC+2), le 29/06 00:00 local devient 28/06 22:00 UTC et
  // serait stocké au 28/06. On construit donc un minuit UTC à partir des
  // composantes LOCALES pour stocker le bon jour, quel que soit le fuseau
  // du serveur (local en dev, UTC sur Vercel).
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const factors =
    health.readinessFactors !== null
      ? (health.readinessFactors as unknown as Prisma.InputJsonValue)
      : undefined;

  const data: Prisma.DailyHealthUpdateInput = {};
  if (health.sleepMinutes !== null) {
    data.sleepMinutes = health.sleepMinutes;
  }
  if (health.napMinutes !== null) {
    data.napMinutes = health.napMinutes;
  }
  if (health.restingHr !== null) {
    data.restingHr = health.restingHr;
  }
  if (health.hrv !== null) {
    data.hrv = health.hrv;
  }
  if (health.weightKg !== null) {
    data.weightKg = health.weightKg;
  }
  if (health.readinessScore !== null) {
    data.recoveryScore = health.readinessScore;
  }
  if (health.readinessLevel !== null) {
    data.readinessLevel = health.readinessLevel;
  }
  if (health.readinessFeedback !== null) {
    data.readinessFeedback = health.readinessFeedback;
  }
  if (factors !== null) {
    data.readinessFactors = factors;
  }
  if (health.hrvStatus !== null) {
    data.hrvStatus = health.hrvStatus;
  }
  if (health.hrvBaselineLow !== null) {
    data.hrvBaselineLow = health.hrvBaselineLow;
  }
  if (health.hrvBaselineHigh !== null) {
    data.hrvBaselineHigh = health.hrvBaselineHigh;
  }
  if (health.stress !== null) {
    data.stress = health.stress;
  }
  if (health.bodyBattery !== null) {
    data.bodyBattery = health.bodyBattery;
  }
  if (health.totalSteps !== null) {
    data.totalSteps = health.totalSteps;
  }
  const { sleep } = health;
  if (sleep.sleepScore !== null) {
    data.sleepScore = sleep.sleepScore;
  }
  if (sleep.sleepDeepMin !== null) {
    data.sleepDeepMin = sleep.sleepDeepMin;
  }
  if (sleep.sleepLightMin !== null) {
    data.sleepLightMin = sleep.sleepLightMin;
  }
  if (sleep.sleepRemMin !== null) {
    data.sleepRemMin = sleep.sleepRemMin;
  }
  if (sleep.sleepAwakeMin !== null) {
    data.sleepAwakeMin = sleep.sleepAwakeMin;
  }
  if (sleep.sleepBedtimeMin !== null) {
    data.sleepBedtimeMin = sleep.sleepBedtimeMin;
  }
  if (sleep.sleepWakeMin !== null) {
    data.sleepWakeMin = sleep.sleepWakeMin;
  }
  if (sleep.sleepRespiration !== null) {
    data.sleepRespiration = sleep.sleepRespiration;
  }
  if (sleep.sleepAvgStress !== null) {
    data.sleepAvgStress = sleep.sleepAvgStress;
  }
  if (sleep.sleepScoreFeedback !== null) {
    data.sleepScoreFeedback = sleep.sleepScoreFeedback;
  }

  await prisma.dailyHealth.upsert({
    where: { athleteId_date: { athleteId, date: day } },
    create: {
      athleteId,
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
  await ingestGarminHealth(athleteId, health, day);
  return 'updated';
}

export async function syncGarminHealth(
  athleteId: string,
  options?: {
    days?: number;
    full?: boolean;
  },
): Promise<GarminSyncResult> {
  return runGarminCall(athleteId, async () => {
    const account = await getGarminAccount(athleteId);
    if (!account || !isGarminAccountConnected(account)) {
      throw new ProviderAuthError('Session Garmin expirée. Reconnecte Garmin dans les paramètres.');
    }

    const client = await buildFreshGarminClient(athleteId, account);

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
        return upsertGarminHealthDay(athleteId, client, date, weightKg);
      },
    );

    const updated = outcomes.filter((o) => o === 'updated').length;
    const emptyDays = outcomes.filter((o) => o === 'empty').length;

    const refreshed = currentTokens(client);
    await prisma.garminAccount.update({
      where: { athleteId },
      data: {
        oauth1TokenEnc: encryptGarminToken(refreshed.oauth1),
        oauth2TokenEnc: encryptGarminToken(refreshed.oauth2),
        lastSyncAt: new Date(),
      },
    });

    const backfill = await backfillHealthObservationsFromDailyHealth(athleteId, {
      days: options?.full ? 365 : fallbackDays,
    });

    return { days, updated, emptyDays, observationsBackfilled: backfill.ingested };
  });
}
