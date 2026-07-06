import { Prisma } from '@prisma/client';
import { format, startOfDay, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { syncSinceFromLastSync, syncWindowDays } from '@/lib/integrations/sync-since';
import {
  clientFromTokens,
  currentTokens,
  fetchAthleteThresholds,
  fetchDailyHealth,
  fetchWeightRange,
  loginWithCredentials,
  type GarminAthleteThresholds,
  type GarminDailyHealth,
  type GarminTokens,
} from '@/lib/integrations/garmin';
import { observationEngine } from '@/lib/engines/observation-engine';
import { garminHealthToObservations } from '@/core/adapters/garmin-health-adapter';
import { backfillHealthObservationsFromDailyHealth } from './health-observation-backfill';

const ATHLETE_ID = 'default';

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
  if (!account) throw new Error('Compte Garmin non connecté');
  return clientFromTokens({
    oauth1: account.oauth1Token as GarminTokens['oauth1'],
    oauth2: account.oauth2Token as GarminTokens['oauth2'],
  });
}

export async function disconnectGarmin() {
  await prisma.garminAccount.deleteMany({ where: { id: ACCOUNT_ID } });
}

export async function connectGarmin(username: string, password: string) {
  const { tokens, profile } = await loginWithCredentials(username, password);

  await prisma.garminAccount.upsert({
    where: { id: ACCOUNT_ID },
    create: {
      id: ACCOUNT_ID,
      displayName: profile.displayName,
      fullName: profile.fullName,
      oauth1Token: tokens.oauth1 as Prisma.InputJsonValue,
      oauth2Token: tokens.oauth2 as Prisma.InputJsonValue,
    },
    update: {
      displayName: profile.displayName,
      fullName: profile.fullName,
      oauth1Token: tokens.oauth1 as Prisma.InputJsonValue,
      oauth2Token: tokens.oauth2 as Prisma.InputJsonValue,
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
  const account = await getGarminAccount();
  if (!account) throw new Error('Compte Garmin non connecté');

  const client = clientFromTokens({
    oauth1: account.oauth1Token,
    oauth2: account.oauth2Token,
  });

  const thresholds = await fetchAthleteThresholds(client);

  const data: Prisma.AthleteProfileUncheckedUpdateInput = {
    thresholdsSyncedAt: new Date(),
  };
  if (thresholds.ftpW != null) data.ftpW = thresholds.ftpW;
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
      oauth1Token: refreshed.oauth1 as Prisma.InputJsonValue,
      oauth2Token: refreshed.oauth2 as Prisma.InputJsonValue,
    },
  });

  const imported =
    thresholds.ftpW != null ||
    thresholds.lthr != null ||
    thresholds.runThresholdPaceSecPerKm != null ||
    thresholds.vo2maxRunning != null ||
    thresholds.vo2maxCycling != null;

  return { ...thresholds, imported };
}

export interface GarminSyncResult {
  days: number;
  updated: number;
  emptyDays: number;
  observationsBackfilled?: number;
}

export async function syncGarminHealth(options?: {
  days?: number;
  full?: boolean;
}): Promise<GarminSyncResult> {
  const account = await getGarminAccount();
  if (!account) throw new Error('Compte Garmin non connecté');

  const tokens: GarminTokens = {
    oauth1: account.oauth1Token,
    oauth2: account.oauth2Token,
  };
  const client = clientFromTokens(tokens);

  const today = startOfDay(new Date());
  const since = options?.full
    ? subDays(today, 365)
    : syncSinceFromLastSync(account.lastSyncAt, options?.days ?? 60);
  const days = syncWindowDays(since);
  let updated = 0;
  let emptyDays = 0;

  const weightMap = await fetchWeightRange(client, since, today);

  for (let date = today; date >= since; date = subDays(date, 1)) {
    const weightKg = weightMap.get(format(date, 'yyyy-MM-dd')) ?? null;
    const health = await fetchDailyHealth(client, date, weightKg);

    const hasData =
      health.sleepMinutes != null ||
      health.napMinutes != null ||
      health.restingHr != null ||
      health.hrv != null ||
      health.weightKg != null ||
      health.readinessScore != null ||
      health.hrvStatus != null ||
      health.stress != null ||
      health.bodyBattery != null ||
      health.sleep.sleepScore != null;

    if (!hasData) {
      emptyDays += 1;
      continue;
    }

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
    updated += 1;
  }

  const refreshed = currentTokens(client);
  await prisma.garminAccount.update({
    where: { id: ACCOUNT_ID },
    data: {
      oauth1Token: refreshed.oauth1 as Prisma.InputJsonValue,
      oauth2Token: refreshed.oauth2 as Prisma.InputJsonValue,
      lastSyncAt: new Date(),
    },
  });

  const backfill = await backfillHealthObservationsFromDailyHealth(ATHLETE_ID, {
    days: options?.full ? 365 : (options?.days ?? 60),
  });

  return { days, updated, emptyDays, observationsBackfilled: backfill.ingested };
}
