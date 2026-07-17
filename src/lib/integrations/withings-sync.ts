import { BodyCompositionSource, Prisma } from '@prisma/client';
import { format, startOfDay, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { observationEngine } from '@/lib/engines/observation-engine';
import { withingsMeasurementToBodyComposition } from '@/core/adapters/withings-adapter';
import {
  fetchWithingsMeasurements,
  fetchWithingsHeartList,
  refreshWithingsToken,
  type WithingsParsedMeasurement,
} from '@/lib/integrations/withings';
import { enrichMeasurementsWithHeartEcg } from '@/lib/integrations/withings-measures';
import { syncSinceFromLastSync, syncWindowDays } from '@/lib/integrations/sync-since';

const ATHLETE_ID = 'default';
const ACCOUNT_ID = 'default';

async function ingestWithingsMeasurement(measurement: WithingsParsedMeasurement): Promise<void> {
  try {
    const raw = withingsMeasurementToBodyComposition(measurement, new Date());
    if (!raw) return;
    await observationEngine.ingest(ATHLETE_ID, raw);
  } catch (err) {
    console.error('[ObservationEngine] withings ingest failed:', err);
  }
}

export async function getWithingsAccount() {
  return prisma.withingsAccount.findUnique({ where: { id: ACCOUNT_ID } });
}

export async function disconnectWithings() {
  await prisma.withingsAccount.deleteMany({ where: { id: ACCOUNT_ID } });
}

export async function getValidWithingsAccessToken(): Promise<string> {
  const account = await getWithingsAccount();
  if (!account) throw new Error('Compte Withings non connecté');

  const expiresSoon = account.expiresAt.getTime() - Date.now() < 60_000;
  if (!expiresSoon) return account.accessToken;

  const refreshed = await refreshWithingsToken(account.refreshToken);
  await prisma.withingsAccount.update({
    where: { id: ACCOUNT_ID },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      withingsUserId: String(refreshed.userid),
    },
  });
  return refreshed.access_token;
}

function measurementToPrisma(
  m: WithingsParsedMeasurement,
): Prisma.BodyCompositionMeasurementCreateInput {
  const musclePct =
    m.muscleKg != null && m.weightKg != null && m.weightKg > 0
      ? (m.muscleKg / m.weightKg) * 100
      : null;

  return {
    source: BodyCompositionSource.WITHINGS,
    externalId: m.grpid,
    measuredAt: m.measuredAt,
    weightKg: m.weightKg,
    bmi: m.bmi,
    bodyFatPct: m.bodyFatPct,
    musclePct,
    boneKg: m.boneKg,
    bmr: m.bmr,
    visceralFat: m.visceralFat,
    waterPct: m.waterPct,
    fatFreeWeightKg: m.fatFreeWeightKg,
    heartRate: m.heartRate != null ? Math.round(m.heartRate) : null,
    bodyAge: m.metabolicAge != null ? Math.round(m.metabolicAge) : null,
    vascularAgeYears: m.vascularAgeYears != null ? Math.round(m.vascularAgeYears) : null,
    pulseWaveVelocity: m.pulseWaveVelocity,
    vo2Max: m.vo2Max,
    nerveHealthScore: m.nerveHealthScore,
    nerveHealthLeft: m.nerveHealthLeft,
    nerveHealthRight: m.nerveHealthRight,
    nerveResponseScore: m.nerveResponseScore,
    skinConductance: m.skinConductance,
    metabolicAge: m.metabolicAge != null ? Math.round(m.metabolicAge) : null,
    hydrationKg: m.hydrationKg,
    fatMassKg: m.fatMassKg,
    extracellularWaterKg: m.extracellularWaterKg,
    intracellularWaterKg: m.intracellularWaterKg,
    withingsExtras: (m.withingsExtras ?? Prisma.JsonNull) as Prisma.InputJsonValue,
  };
}

async function upsertDailyWeightFromWithings(m: WithingsParsedMeasurement) {
  if (m.weightKg == null) return;

  const local = m.measuredAt;
  const day = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));

  await prisma.dailyHealth.upsert({
    where: { date: day },
    create: { date: day, weightKg: m.weightKg },
    update: { weightKg: m.weightKg },
  });
}

export interface WithingsSyncResult {
  imported: number;
  updated: number;
  days: number;
}

export async function syncWithingsHealth(options?: {
  days?: number;
  full?: boolean;
}): Promise<WithingsSyncResult> {
  const account = await getWithingsAccount();
  if (!account) throw new Error('Compte Withings non connecté');

  const accessToken = await getValidWithingsAccessToken();
  const since = options?.full
    ? subDays(startOfDay(new Date()), 365 * 3)
    : syncSinceFromLastSync(account.lastSyncAt, options?.days ?? 90);
  const days = syncWindowDays(since);
  const range = {
    startdate: Math.floor(since.getTime() / 1000),
    enddate: Math.floor(Date.now() / 1000),
  };

  const measurementsRaw = await fetchWithingsMeasurements(accessToken, range);
  let measurements = measurementsRaw;
  try {
    const heartRecords = await fetchWithingsHeartList(accessToken, range);
    measurements = enrichMeasurementsWithHeartEcg(measurementsRaw, heartRecords);
  } catch (err) {
    console.warn(
      '[withings-sync] Heart v2 list unavailable, ECG classification from getmeas only:',
      err,
    );
  }

  let imported = 0;
  let updated = 0;
  const weightByDay = new Map<string, WithingsParsedMeasurement>();

  if (measurements.length > 0) {
    const externalIds = measurements.map((m) => m.grpid);
    const existingRows = await prisma.bodyCompositionMeasurement.findMany({
      where: {
        source: BodyCompositionSource.WITHINGS,
        externalId: { in: externalIds },
      },
      select: { externalId: true },
    });
    const existingIds = new Set(
      existingRows.map((r) => r.externalId).filter((id): id is string => id != null),
    );

    const toCreate: Prisma.BodyCompositionMeasurementCreateManyInput[] = [];
    const toCreateMeasurements: WithingsParsedMeasurement[] = [];
    const updateOps: Promise<unknown>[] = [];

    for (const measurement of measurements) {
      const data = measurementToPrisma(measurement);
      const dayKey = format(measurement.measuredAt, 'yyyy-MM-dd');
      const prev = weightByDay.get(dayKey);
      if (!prev || measurement.measuredAt.getTime() > prev.measuredAt.getTime()) {
        weightByDay.set(dayKey, measurement);
      }

      if (existingIds.has(measurement.grpid)) {
        updateOps.push(
          prisma.bodyCompositionMeasurement.update({
            where: {
              source_externalId: {
                source: BodyCompositionSource.WITHINGS,
                externalId: measurement.grpid,
              },
            },
            data,
          }),
        );
      } else {
        toCreate.push(data as Prisma.BodyCompositionMeasurementCreateManyInput);
        toCreateMeasurements.push(measurement);
      }
    }

    if (toCreate.length > 0) {
      const result = await prisma.bodyCompositionMeasurement.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
      imported = result.count;
      await Promise.all(toCreateMeasurements.map((m) => ingestWithingsMeasurement(m)));
    }

    if (updateOps.length > 0) {
      await Promise.all(updateOps);
      updated = updateOps.length;
    }
  }

  await Promise.all([...weightByDay.values()].map((m) => upsertDailyWeightFromWithings(m)));

  await prisma.withingsAccount.update({
    where: { id: ACCOUNT_ID },
    data: { lastSyncAt: new Date() },
  });

  return { imported, updated, days };
}

/** Jours où Withings a une pesée (priorité sur Renpho pour DailyHealth). */
export async function withingsWeighInDayKeys(since: Date): Promise<Set<string>> {
  const rows = await prisma.bodyCompositionMeasurement.findMany({
    where: {
      source: BodyCompositionSource.WITHINGS,
      measuredAt: { gte: since },
    },
    select: { measuredAt: true },
  });
  return new Set(rows.map((r) => format(r.measuredAt, 'yyyy-MM-dd')));
}
