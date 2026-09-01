import { Prisma } from '@prisma/client';
import { isSet } from '@/lib/util/value';
import { format, startOfDay, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { syncSinceFromLastSync, syncWindowDays } from '@/lib/integrations/shared/sync-since';
import {
  clientFromTokens,
  currentTokens,
  diGarminTokensExpiresAtMs,
  diTokensToGarminTokens,
  garminAccessTokenExpiresAtMs,
  garminTokensFromStorage,
  fetchAthleteThresholds,
  fetchDailyHealth,
  fetchWeightRange,
  isDiGarminTokens,
  refreshDiGarminTokens,
  type GarminAthleteThresholds,
  type GarminDailyHealth,
} from '@/lib/integrations/garmin/garmin';
import { mapPythonGarminconnectTokenStore } from '@/lib/integrations/garmin/garmin-tokenstore';
import { observationEngine } from '@/lib/engines/observation-engine';
import { garminHealthToObservations } from '@/core/adapters/garmin-health-adapter';
import {
  isCredentialFailure,
  isGarminAccountConnected,
  isDecryptMalformedSoftFailure,
  ProviderAuthError,
} from '@/lib/integrations/shared/connection-status';
import { backfillHealthObservationsFromDailyHealth } from '../shared/health-observation-backfill';
import { mapWithConcurrency } from '@/lib/async/map-with-concurrency';
import {
  decryptSecret,
  encryptSecret,
  isSecretAuthenticityFailure,
  isSecretDecryptFailure,
} from '@/lib/secret-box';
import type { GarminTokens } from '@/lib/integrations/garmin/garmin';

/** Encrypts one OAuth token object for storage in the `*TokenEnc` columns. */
export function encryptGarminToken(token: unknown): string {
  return encryptSecret(JSON.stringify(token));
}

/** Reverses `encryptGarminToken` — reads a stored `*TokenEnc` column back into tokens. */
export function decryptGarminTokens(oauth1Enc: string, oauth2Enc: string): GarminTokens {
  try {
    return garminTokensFromStorage(
      JSON.parse(decryptSecret(oauth1Enc)),
      JSON.parse(decryptSecret(oauth2Enc)),
    );
  } catch (error) {
    if (isSecretDecryptFailure(error)) {
      throw error;
    }
    // Corrupted JSON after a successful decrypt is not recoverable — treat as dead credentials.
    throw new ProviderAuthError('Session Garmin expirée. Reconnecte Garmin dans les paramètres.', {
      cause: error,
    });
  }
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

/** Refresh a stored DI access token once it's close to expiry. */
const DI_REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * Decrypts an account's stored tokens into a ready-to-use client.
 *
 * Auth rules (cron + API sync):
 * - Never runs email/password SSO (`loginWithCredentials` / widget login).
 * - DI tokens: refresh via diauth when near expiry; on failure → needs-reconnect.
 * - Legacy Garth/oauth1 tokens: usable until expiry, then needs-reconnect
 *   (Garth exchange is dead — do not re-login from cron).
 */
export async function buildFreshGarminClient(
  athleteId: string,
  account: { oauth1TokenEnc: string; oauth2TokenEnc: string },
) {
  let tokens = decryptGarminTokens(account.oauth1TokenEnc, account.oauth2TokenEnc);

  if (isDiGarminTokens(tokens)) {
    if (diGarminTokensExpiresAtMs(tokens) - Date.now() < DI_REFRESH_MARGIN_MS) {
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

  // Legacy oauth1/Garth session: never attempt SSO or dead oauth1→oauth2 exchange.
  if (garminAccessTokenExpiresAtMs(tokens) - Date.now() < DI_REFRESH_MARGIN_MS) {
    await revokeGarminCredentials(athleteId);
    throw new ProviderAuthError(
      'Session Garmin expirée. Reconnecte Garmin dans les paramètres.',
    );
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
    // Wrong-key / GCM auth failure: fleet incident — never wipe stored tokens.
    if (isSecretAuthenticityFailure(error)) {
      throw error;
    }
    // Local placeholder / unframed blob: clear so the hub shows reconnect.
    if (isDecryptMalformedSoftFailure(error) || isCredentialFailure(error)) {
      await revokeGarminCredentials(athleteId);
      throw new ProviderAuthError(
        'Session Garmin expirée. Reconnecte Garmin dans les paramètres.',
        {
          cause: error,
        },
      );
    }
    throw error;
  }
}

export async function connectGarmin(
  athleteId: string,
  _username: string,
  _password: string,
): Promise<never> {
  throw new ProviderAuthError(
    'La connexion Garmin email/mot de passe via le serveur Sharpit ne fonctionne plus (auth Garmin 2026). Mint les jetons en local avec python-garminconnect (≥0.3), puis importe-les.',
  );
}

/**
 * Persists DI tokens minted by python-garminconnect ≥ 0.3 (or a Sharpit DI export).
 * Cron/API sync only refresh these tokens — they never re-run email/password SSO.
 */
export async function importGarminDiTokenStore(athleteId: string, rawStore: unknown) {
  const di = mapPythonGarminconnectTokenStore(rawStore);
  let tokens = diTokensToGarminTokens(di);

  let displayName: string | null = null;
  let fullName: string | null = null;
  try {
    const client = clientFromTokens(tokens);
    const profile = (await client.getUserProfile()) as {
      displayName?: string;
      fullName?: string;
      userName?: string;
    };
    displayName = profile.displayName ?? profile.userName ?? null;
    fullName = profile.fullName ?? null;
    tokens = currentTokens(client);
  } catch {
    // Profile is best-effort — tokens are still persisted for cron refresh.
  }

  await prisma.garminAccount.upsert({
    where: { athleteId },
    create: {
      athleteId,
      displayName,
      fullName,
      oauth1TokenEnc: encryptGarminToken(tokens.oauth1),
      oauth2TokenEnc: encryptGarminToken(tokens.oauth2),
    },
    update: {
      displayName,
      fullName,
      oauth1TokenEnc: encryptGarminToken(tokens.oauth1),
      oauth2TokenEnc: encryptGarminToken(tokens.oauth2),
    },
  });

  return { displayName, fullName };
}

export interface GarminThresholdsImport extends GarminAthleteThresholds {
  imported: boolean;
}

/**
 * Importe les seuils de l'athlète depuis Garmin et les enregistre dans le
 * profil. Seuls les champs renvoyés par Garmin sont écrits (un champ absent ne
 * remplace pas une valeur existante).
 */
function buildThresholdProfileUpdate(
  thresholds: GarminAthleteThresholds,
): Prisma.AthleteProfileUncheckedUpdateInput {
  const data: Prisma.AthleteProfileUncheckedUpdateInput =
    thresholds.failedSources.length === 0 ? { thresholdsSyncedAt: new Date() } : {};
  const fields: Array<[keyof Prisma.AthleteProfileUncheckedUpdateInput, number | null]> = [
    ['ftpW', thresholds.ftpW],
    ['maxHr', thresholds.maxHr],
    ['lthr', thresholds.lthr],
    ['runThresholdPaceSecPerKm', thresholds.runThresholdPaceSecPerKm],
    ['vo2maxRunning', thresholds.vo2maxRunning],
    ['vo2maxCycling', thresholds.vo2maxCycling],
  ];
  for (const [key, value] of fields) {
    if (isSet(value)) {
      data[key] = value as never;
    }
  }
  return data;
}

function thresholdsWereImported(thresholds: GarminAthleteThresholds): boolean {
  return [
    thresholds.ftpW,
    thresholds.maxHr,
    thresholds.lthr,
    thresholds.runThresholdPaceSecPerKm,
    thresholds.vo2maxRunning,
    thresholds.vo2maxCycling,
  ].some((value) => isSet(value));
}

async function importGarminThresholdsForAccount(
  athleteId: string,
  account: NonNullable<Awaited<ReturnType<typeof getGarminAccount>>>,
): Promise<GarminThresholdsImport> {
  const client = await buildFreshGarminClient(athleteId, account);
  const thresholds = await fetchAthleteThresholds(client);

  await prisma.athleteProfile.update({
    where: { id: athleteId },
    data: buildThresholdProfileUpdate(thresholds),
  });

  const refreshed = currentTokens(client);
  await prisma.garminAccount.update({
    where: { athleteId },
    data: {
      oauth1TokenEnc: encryptGarminToken(refreshed.oauth1),
      oauth2TokenEnc: encryptGarminToken(refreshed.oauth2),
    },
  });

  return { ...thresholds, imported: thresholdsWereImported(thresholds) };
}

export async function importGarminThresholds(athleteId: string): Promise<GarminThresholdsImport> {
  return runGarminCall(athleteId, async () => {
    const account = await getGarminAccount(athleteId);
    if (!account || !isGarminAccountConnected(account)) {
      throw new ProviderAuthError('Session Garmin expirée. Reconnecte Garmin dans les paramètres.');
    }
    return importGarminThresholdsForAccount(athleteId, account);
  });
}

export interface GarminSyncResult {
  days: number;
  updated: number;
  emptyDays: number;
  observationsBackfilled?: number;
}

function healthHasData(health: GarminDailyHealth): boolean {
  const { sleep } = health;
  return [
    health.sleepMinutes,
    health.napMinutes,
    health.restingHr,
    health.hrv,
    health.weightKg,
    health.readinessScore,
    health.hrvStatus,
    health.stress,
    health.bodyBattery,
    health.totalSteps,
    sleep.sleepScore,
  ].some((value) => isSet(value));
}

function assignHealthScalars(
  data: Prisma.DailyHealthUpdateInput,
  health: GarminDailyHealth,
  factors: Prisma.InputJsonValue | undefined,
): void {
  const scalarFields: Array<[keyof Prisma.DailyHealthUpdateInput, unknown]> = [
    ['sleepMinutes', health.sleepMinutes],
    ['napMinutes', health.napMinutes],
    ['restingHr', health.restingHr],
    ['hrv', health.hrv],
    ['weightKg', health.weightKg],
    ['recoveryScore', health.readinessScore],
    ['readinessLevel', health.readinessLevel],
    ['readinessFeedback', health.readinessFeedback],
    ['readinessFactors', factors],
    ['hrvStatus', health.hrvStatus],
    ['hrvBaselineLow', health.hrvBaselineLow],
    ['hrvBaselineHigh', health.hrvBaselineHigh],
    ['stress', health.stress],
    ['bodyBattery', health.bodyBattery],
    ['totalSteps', health.totalSteps],
  ];
  for (const [key, value] of scalarFields) {
    if (isSet(value) && value !== undefined) {
      data[key] = value as never;
    }
  }
}

function assignSleepScalars(
  data: Prisma.DailyHealthUpdateInput,
  sleep: GarminDailyHealth['sleep'],
): void {
  const sleepFields: Array<[keyof Prisma.DailyHealthUpdateInput, unknown]> = [
    ['sleepScore', sleep.sleepScore],
    ['sleepDeepMin', sleep.sleepDeepMin],
    ['sleepLightMin', sleep.sleepLightMin],
    ['sleepRemMin', sleep.sleepRemMin],
    ['sleepAwakeMin', sleep.sleepAwakeMin],
    ['sleepBedtimeMin', sleep.sleepBedtimeMin],
    ['sleepWakeMin', sleep.sleepWakeMin],
    ['sleepRespiration', sleep.sleepRespiration],
    ['sleepAvgStress', sleep.sleepAvgStress],
    ['sleepScoreFeedback', sleep.sleepScoreFeedback],
  ];
  for (const [key, value] of sleepFields) {
    if (isSet(value)) {
      data[key] = value as never;
    }
  }
}

function buildGarminHealthUpdateData(health: GarminDailyHealth): Prisma.DailyHealthUpdateInput {
  const factors = isSet(health.readinessFactors)
    ? (health.readinessFactors as unknown as Prisma.InputJsonValue)
    : undefined;
  const data: Prisma.DailyHealthUpdateInput = {};
  assignHealthScalars(data, health, factors);
  assignSleepScalars(data, health.sleep);
  return data;
}

function buildGarminHealthCreateData(
  athleteId: string,
  day: Date,
  health: GarminDailyHealth,
  factors: Prisma.InputJsonValue | undefined,
): Prisma.DailyHealthUncheckedCreateInput {
  const { sleep } = health;
  return {
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
  };
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

  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const factors = isSet(health.readinessFactors)
    ? (health.readinessFactors as unknown as Prisma.InputJsonValue)
    : undefined;

  await prisma.dailyHealth.upsert({
    where: { athleteId_date: { athleteId, date: day } },
    create: buildGarminHealthCreateData(athleteId, day, health, factors),
    update: buildGarminHealthUpdateData(health),
  });
  await ingestGarminHealth(athleteId, health, day);
  return 'updated';
}

function buildGarminHealthDateRange(
  options: { days?: number; full?: boolean } | undefined,
  lastSyncAt: Date | null,
): { since: Date; days: number; dates: Date[] } {
  const fallbackDays = options?.days ?? GARMIN_HEALTH_DEFAULT_FALLBACK_DAYS;
  const today = startOfDay(new Date());
  const since = options?.full
    ? subDays(today, 365)
    : syncSinceFromLastSync(lastSyncAt, fallbackDays);
  const days = syncWindowDays(since);
  const dates: Date[] = [];
  for (let date = today; date >= since; date = subDays(date, 1)) {
    dates.push(date);
  }
  return { since, days, dates };
}

async function runGarminHealthSync(
  athleteId: string,
  options?: { days?: number; full?: boolean },
): Promise<GarminSyncResult> {
  const account = await getGarminAccount(athleteId);
  if (!account || !isGarminAccountConnected(account)) {
    throw new ProviderAuthError('Session Garmin expirée. Reconnecte Garmin dans les paramètres.');
  }

  const client = await buildFreshGarminClient(athleteId, account);
  const { since, days, dates } = buildGarminHealthDateRange(options, account.lastSyncAt);
  const weightMap = await fetchWeightRange(client, since, startOfDay(new Date()));

  const outcomes = await mapWithConcurrency(dates, GARMIN_HEALTH_DAY_CONCURRENCY, (date) => {
    const weightKg = weightMap.get(format(date, 'yyyy-MM-dd')) ?? null;
    return upsertGarminHealthDay(athleteId, client, date, weightKg);
  });

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
    days: options?.full ? 365 : days,
  });

  return { days, updated, emptyDays, observationsBackfilled: backfill.ingested };
}

export async function syncGarminHealth(
  athleteId: string,
  options?: {
    days?: number;
    full?: boolean;
  },
): Promise<GarminSyncResult> {
  return runGarminCall(athleteId, () => runGarminHealthSync(athleteId, options));
}
