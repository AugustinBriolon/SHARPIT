import { BodyCompositionSource, Prisma } from '@prisma/client';
import { format, startOfDay, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { type RenphoMeasurement, renphoClientFromCredentials } from '@/lib/integrations/renpho';
import { decryptSecret, encryptSecret } from '@/lib/secret-box';
import { observationEngine } from '@/lib/engines/observation-engine';
import { renphoMeasurementToBodyComposition } from '@/core/adapters/renpho-adapter';
import { withingsWeighInDayKeys } from '@/lib/integrations/withings-sync';
import { syncSinceFromLastSync, syncWindowDays } from '@/lib/integrations/sync-since';

const ATHLETE_ID = 'default';

async function ingestRenphoMeasurement(measurement: RenphoMeasurement): Promise<void> {
  try {
    const raw = renphoMeasurementToBodyComposition(measurement, new Date());
    if (!raw) return;
    await observationEngine.ingest(ATHLETE_ID, raw);
  } catch (err) {
    console.error('[ObservationEngine] renpho ingest failed:', err);
  }
}

const ACCOUNT_ID = 'default';

export async function getRenphoAccount() {
  return prisma.renphoAccount.findUnique({ where: { id: ACCOUNT_ID } });
}

function getRenphoClientFromAccount(account: { email: string; passwordEnc: string }) {
  return renphoClientFromCredentials(account.email, decryptSecret(account.passwordEnc));
}

export async function connectRenpho(email: string, password: string) {
  const client = renphoClientFromCredentials(email, password);
  const user = await client.getCurrentUser();

  await prisma.renphoAccount.upsert({
    where: { id: ACCOUNT_ID },
    create: {
      id: ACCOUNT_ID,
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

export async function disconnectRenpho() {
  await prisma.renphoAccount.deleteMany({ where: { id: ACCOUNT_ID } });
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
async function upsertDailyWeightFromMeasurement(m: RenphoMeasurement, withingsDays: Set<string>) {
  if (m.weight == null) return;

  const local = new Date(m.time_stamp * 1000);
  const dayKey = format(local, 'yyyy-MM-dd');
  if (withingsDays.has(dayKey)) return;

  const day = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));

  await prisma.dailyHealth.upsert({
    where: { date: day },
    create: { date: day, weightKg: m.weight },
    update: { weightKg: m.weight },
  });
}

export interface RenphoSyncResult {
  imported: number;
  updated: number;
  days: number;
}

export async function syncRenphoHealth(options?: {
  days?: number;
  full?: boolean;
}): Promise<RenphoSyncResult> {
  const account = await getRenphoAccount();
  if (!account) throw new Error('Compte Renpho non connecté');

  const client = getRenphoClientFromAccount(account);
  const since = options?.full
    ? subDays(startOfDay(new Date()), 365 * 3)
    : syncSinceFromLastSync(account.lastSyncAt, options?.days ?? 60);
  const days = syncWindowDays(since);
  const sinceTimestamp = options?.full ? undefined : Math.floor(since.getTime() / 1000);
  const limit = options?.full ? 2000 : Math.max(days * 2, 100);

  const [measurements, withingsDays] = await Promise.all([
    client.getMeasurements({ sinceTimestamp, limit }),
    withingsWeighInDayKeys(since),
  ]);

  let imported = 0;
  let updated = 0;
  const weightByDay = new Map<string, RenphoMeasurement>();

  for (const measurement of measurements) {
    const data = measurementToPrisma(measurement);
    const existing = await prisma.bodyCompositionMeasurement.findUnique({
      where: {
        source_externalId: {
          source: BodyCompositionSource.RENPHO,
          externalId: measurement.id,
        },
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.bodyCompositionMeasurement.update({
        where: {
          source_externalId: {
            source: BodyCompositionSource.RENPHO,
            externalId: measurement.id,
          },
        },
        data,
      });
      updated += 1;
    } else {
      await prisma.bodyCompositionMeasurement.create({ data });
      await ingestRenphoMeasurement(measurement);
      imported += 1;
    }

    const dayKey = format(new Date(measurement.time_stamp * 1000), 'yyyy-MM-dd');
    const prev = weightByDay.get(dayKey);
    if (!prev || measurement.time_stamp > prev.time_stamp) {
      weightByDay.set(dayKey, measurement);
    }
  }

  for (const measurement of weightByDay.values()) {
    await upsertDailyWeightFromMeasurement(measurement, withingsDays);
  }

  await prisma.renphoAccount.update({
    where: { id: ACCOUNT_ID },
    data: { lastSyncAt: new Date() },
  });

  return { imported, updated, days };
}
