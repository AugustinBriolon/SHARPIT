import { BodyCompositionSource, Prisma } from '@prisma/client';
import {
  isProviderAuthFailure,
  isRenphoAccountConnected,
  ProviderAuthError,
} from '@/lib/integrations/shared/connection-status';
import { format, startOfDay, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import {
  type RenphoMeasurement,
  renphoClientFromCredentials,
} from '@/lib/integrations/renpho/renpho';
import { decryptSecret, encryptSecret } from '@/lib/secret-box';
import { observationEngine } from '@/lib/engines/observation-engine';
import { renphoMeasurementToBodyComposition } from '@/core/adapters/renpho-adapter';
import { backfillBodyCompositionObservationsFromMeasurements } from '@/lib/integrations/shared/body-composition-observation-backfill';
import { withingsWeighInDayKeys } from '@/lib/integrations/withings/withings-sync';
import { syncSinceFromLastSync, syncWindowDays } from '@/lib/integrations/shared/sync-since';

async function ingestRenphoMeasurement(
  athleteId: string,
  measurement: RenphoMeasurement,
): Promise<void> {
  try {
    const raw = renphoMeasurementToBodyComposition(measurement, new Date());
    if (!raw) return;
    await observationEngine.ingest(athleteId, raw);
  } catch (err) {
    console.error('[ObservationEngine] renpho ingest failed:', err);
  }
}

export async function getRenphoAccount(athleteId: string) {
  return prisma.renphoAccount.findUnique({ where: { athleteId } });
}

function getRenphoClientFromAccount(account: { email: string; passwordEnc: string }) {
  return renphoClientFromCredentials(account.email, decryptSecret(account.passwordEnc));
}

export async function connectRenpho(athleteId: string, email: string, password: string) {
  const client = renphoClientFromCredentials(email, password);
  const user = await client.getCurrentUser();

  await prisma.renphoAccount.upsert({
    where: { athleteId },
    create: {
      athleteId,
      email,
      passwordEnc: encryptSecret(password),
      displayName: user.account_name ?? user.first_name ?? email,
      renphoUserId: user.id,
    },
    update: {
      email,
      passwordEnc: encryptSecret(password),
      displayName: user.account_name ?? user.first_name ?? email,
      renphoUserId: user.id,
    },
  });

  return user;
}

export async function disconnectRenpho(athleteId: string) {
  await prisma.renphoAccount.deleteMany({ where: { athleteId } });
}

/** Keeps the Renpho profile row so the hub can ask for a reconnect. */
export async function revokeRenphoCredentials(athleteId: string) {
  const account = await getRenphoAccount(athleteId);
  if (!account) return;
  await prisma.renphoAccount.update({
    where: { athleteId },
    data: { passwordEnc: '' },
  });
}

function measurementToPrisma(m: RenphoMeasurement): Prisma.BodyCompositionMeasurementCreateInput {
  return {
    source: BodyCompositionSource.RENPHO,
    externalId: m.id,
    measuredAt: new Date(m.time_stamp * 1000),
    weightKg: m.weight ?? null,
    bmi: m.bmi ?? null,
    bodyFatPct: m.bodyfat ?? null,
    waterPct: m.water ?? null,
    musclePct: m.muscle ?? null,
    boneKg: m.bone ?? null,
    bmr: m.bmr ?? null,
    visceralFat: m.visceral_fat ?? null,
    proteinPct: m.protein ?? null,
    bodyAge: m.body_age != null ? Math.round(m.body_age) : null,
    subcutaneousFatPct: m.subcutaneous_fat ?? null,
    skeletalMusclePct: m.skeletal_muscle ?? null,
    fatFreeWeightKg: m.fat_free_weight ?? null,
    heartRate: m.heart_rate ?? null,
  };
}

/** Met à jour le poids du jour dans DailyHealth — sauf si Withings a déjà une pesée ce jour-là. */
async function upsertDailyWeightFromMeasurement(
  athleteId: string,
  m: RenphoMeasurement,
  withingsDays: Set<string>,
) {
  if (m.weight == null) return;

  const local = new Date(m.time_stamp * 1000);
  const dayKey = format(local, 'yyyy-MM-dd');
  if (withingsDays.has(dayKey)) return;

  const day = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));

  await prisma.dailyHealth.upsert({
    where: { athleteId_date: { athleteId, date: day } },
    create: { athleteId, date: day, weightKg: m.weight },
    update: { weightKg: m.weight },
  });
}

export interface RenphoSyncResult {
  imported: number;
  updated: number;
  days: number;
  observationsBackfilled?: number;
}

export async function syncRenphoHealth(
  athleteId: string,
  options?: {
    days?: number;
    full?: boolean;
  },
): Promise<RenphoSyncResult> {
  const account = await getRenphoAccount(athleteId);
  if (!account || !isRenphoAccountConnected(account)) {
    throw new ProviderAuthError('Session Renpho expirée. Reconnecte Renpho dans les paramètres.');
  }

  try {
    const client = getRenphoClientFromAccount(account);
    const since = options?.full
      ? subDays(startOfDay(new Date()), 365 * 3)
      : syncSinceFromLastSync(account.lastSyncAt, options?.days ?? 60);
    const days = syncWindowDays(since);
    const sinceTimestamp = options?.full ? undefined : Math.floor(since.getTime() / 1000);
    const limit = options?.full ? 2000 : Math.max(days * 2, 100);

    const [measurements, withingsDays] = await Promise.all([
      client.getMeasurements({ sinceTimestamp, limit }),
      withingsWeighInDayKeys(athleteId, since),
    ]);

    let imported = 0;
    let updated = 0;
    const weightByDay = new Map<string, RenphoMeasurement>();

    if (measurements.length > 0) {
      const externalIds = measurements.map((m) => m.id);
      const existingRows = await prisma.bodyCompositionMeasurement.findMany({
        where: {
          athleteId,
          source: BodyCompositionSource.RENPHO,
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
        const dayKey = format(new Date(measurement.time_stamp * 1000), 'yyyy-MM-dd');
        const prev = weightByDay.get(dayKey);
        if (!prev || measurement.time_stamp > prev.time_stamp) {
          weightByDay.set(dayKey, measurement);
        }

        if (existingIds.has(measurement.id)) {
          updateOps.push(
            prisma.bodyCompositionMeasurement.update({
              where: {
                athleteId_source_externalId: {
                  athleteId,
                  source: BodyCompositionSource.RENPHO,
                  externalId: measurement.id,
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

      await Promise.all(measurements.map((m) => ingestRenphoMeasurement(athleteId, m)));
    }

    await Promise.all(
      [...weightByDay.values()].map((m) =>
        upsertDailyWeightFromMeasurement(athleteId, m, withingsDays),
      ),
    );

    await prisma.renphoAccount.update({
      where: { athleteId },
      data: { lastSyncAt: new Date() },
    });

    const backfill = await backfillBodyCompositionObservationsFromMeasurements(athleteId, {
      since: options?.full ? subDays(startOfDay(new Date()), 365 * 3) : since,
    });

    return { imported, updated, days, observationsBackfilled: backfill.ingested };
  } catch (error) {
    if (isProviderAuthFailure(error)) {
      await revokeRenphoCredentials(athleteId);
      throw new ProviderAuthError('Session Renpho expirée. Reconnecte Renpho dans les paramètres.');
    }
    throw error;
  }
}
