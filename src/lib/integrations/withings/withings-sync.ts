import { BodyCompositionSource, Prisma } from '@prisma/client';
import {
  isOAuthAccountConnected,
  isProviderAuthFailure,
  ProviderAuthError,
} from '@/lib/integrations/shared/connection-status';
import { format, startOfDay, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { observationEngine } from '@/lib/engines/observation-engine';
import { withingsMeasurementToBodyComposition } from '@/core/adapters/withings-adapter';
import {
  fetchWithingsMeasurements,
  fetchWithingsHeartList,
  refreshWithingsToken,
  type WithingsParsedMeasurement,
} from '@/lib/integrations/withings/withings';
import { enrichMeasurementsWithHeartEcg } from '@/lib/integrations/withings/withings-measures';
import { backfillBodyCompositionObservationsFromMeasurements } from '@/lib/integrations/shared/body-composition-observation-backfill';
import { syncSinceFromLastSync, syncWindowDays } from '@/lib/integrations/shared/sync-since';
import { decryptSecret, encryptSecret } from '@/lib/secret-box';

async function ingestWithingsMeasurement(
  athleteId: string,
  measurement: WithingsParsedMeasurement,
): Promise<void> {
  try {
    const raw = withingsMeasurementToBodyComposition(measurement, new Date());
    if (!raw) return;
    await observationEngine.ingest(athleteId, raw);
  } catch (err) {
    console.error('[ObservationEngine] withings ingest failed:', err);
  }
}

export async function getWithingsAccount(athleteId: string) {
  return prisma.withingsAccount.findUnique({ where: { athleteId } });
}

export async function disconnectWithings(athleteId: string) {
  await prisma.withingsAccount.deleteMany({ where: { athleteId } });
}

/** Keeps the Withings profile row so the hub can ask for a reconnect. */
export async function revokeWithingsCredentials(athleteId: string) {
  const account = await getWithingsAccount(athleteId);
  if (!account) return;
  await prisma.withingsAccount.update({
    where: { athleteId },
    data: {
      accessTokenEnc: '',
      refreshTokenEnc: '',
      expiresAt: new Date(0),
    },
  });
}

export async function getValidWithingsAccessToken(athleteId: string): Promise<string> {
  const account = await getWithingsAccount(athleteId);
  if (!account) throw new Error('Compte Withings non connecté');
  if (!isOAuthAccountConnected(account)) {
    throw new ProviderAuthError(
      'Session Withings expirée. Reconnecte Withings dans les paramètres.',
    );
  }

  const expiresSoon = account.expiresAt.getTime() - Date.now() < 60_000;
  if (!expiresSoon) return decryptSecret(account.accessTokenEnc);

  try {
    const refreshed = await refreshWithingsToken(decryptSecret(account.refreshTokenEnc));
    await prisma.withingsAccount.update({
      where: { athleteId },
      data: {
        accessTokenEnc: encryptSecret(refreshed.access_token),
        refreshTokenEnc: encryptSecret(refreshed.refresh_token),
        expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        withingsUserId: String(refreshed.userid),
      },
    });
    return refreshed.access_token;
  } catch (error) {
    if (isProviderAuthFailure(error)) {
      await revokeWithingsCredentials(athleteId);
      throw new ProviderAuthError(
        'Session Withings expirée. Reconnecte Withings dans les paramètres.',
      );
    }
    throw error;
  }
}

function measurementToPrisma(
  m: WithingsParsedMeasurement,
): Omit<Prisma.BodyCompositionMeasurementUncheckedCreateInput, 'athleteId'> {
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

async function upsertDailyWeightFromWithings(athleteId: string, m: WithingsParsedMeasurement) {
  if (m.weightKg == null) return;

  const local = m.measuredAt;
  const day = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));

  await prisma.dailyHealth.upsert({
    where: { athleteId_date: { athleteId, date: day } },
    create: { athleteId, date: day, weightKg: m.weightKg },
    update: { weightKg: m.weightKg },
  });
}

export interface WithingsSyncResult {
  imported: number;
  updated: number;
  days: number;
  observationsBackfilled?: number;
}

export async function syncWithingsHealth(
  athleteId: string,
  options?: {
    days?: number;
    full?: boolean;
  },
): Promise<WithingsSyncResult> {
  const account = await getWithingsAccount(athleteId);
  if (!account) throw new Error('Compte Withings non connecté');

  const accessToken = await getValidWithingsAccessToken(athleteId);
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
        athleteId,
        source: BodyCompositionSource.WITHINGS,
        externalId: { in: externalIds },
      },
      select: { externalId: true },
    });
    const existingIds = new Set(
      existingRows.map((r) => r.externalId).filter((id): id is string => id != null),
    );

    const toCreate: Prisma.BodyCompositionMeasurementCreateManyInput[] = [];
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
              athleteId_source_externalId: {
                athleteId,
                source: BodyCompositionSource.WITHINGS,
                externalId: measurement.grpid,
              },
            },
            data,
          }),
        );
      } else {
        toCreate.push({ ...data, athleteId } as Prisma.BodyCompositionMeasurementCreateManyInput);
      }
    }

    if (toCreate.length > 0) {
      const result = await prisma.bodyCompositionMeasurement.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
      imported = result.count;
    }

    if (updateOps.length > 0) {
      await Promise.all(updateOps);
      updated = updateOps.length;
    }

    // Ingest every measurement in the sync window — not only new rows. Existing
    // provider rows that predate the observation pipeline are updates here;
    // dedup by externalId makes this safe to re-run.
    await Promise.all(measurements.map((m) => ingestWithingsMeasurement(athleteId, m)));
  }

  await Promise.all(
    [...weightByDay.values()].map((m) => upsertDailyWeightFromWithings(athleteId, m)),
  );

  await prisma.withingsAccount.update({
    where: { athleteId },
    data: { lastSyncAt: new Date() },
  });

  const backfill = await backfillBodyCompositionObservationsFromMeasurements(athleteId, {
    since: options?.full ? subDays(startOfDay(new Date()), 365 * 3) : since,
  });

  return { imported, updated, days, observationsBackfilled: backfill.ingested };
}

/** Jours où Withings a une pesée (priorité sur Renpho pour DailyHealth). */
export async function withingsWeighInDayKeys(athleteId: string, since: Date): Promise<Set<string>> {
  const rows = await prisma.bodyCompositionMeasurement.findMany({
    where: {
      athleteId,
      source: BodyCompositionSource.WITHINGS,
      measuredAt: { gte: since },
    },
    select: { measuredAt: true },
  });
  return new Set(rows.map((r) => format(r.measuredAt, 'yyyy-MM-dd')));
}
