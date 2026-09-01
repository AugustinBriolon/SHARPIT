import { BodyCompositionSource, Prisma } from '@prisma/client';
import { isSet } from '@/lib/util/value';
import {
  isCredentialFailure,
  isDecryptMalformedSoftFailure,
  isRenphoAccountConnected,
  ProviderAuthError,
} from '@/lib/integrations/shared/connection-status';
import { format, startOfDay, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import {
  type RenphoMeasurement,
  renphoClientFromCredentials,
} from '@/lib/integrations/renpho/renpho';
import { decryptSecret, encryptSecret, isSecretAuthenticityFailure } from '@/lib/secret-box';
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
    if (!raw) {
      return;
    }
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
  if (!account) {
    return;
  }
  await prisma.renphoAccount.update({
    where: { athleteId },
    data: { passwordEnc: '' },
  });
}

type RenphoMeasurementScalars = {
  weightKg: number | null;
  bmi: number | null;
  bodyFatPct: number | null;
  waterPct: number | null;
  musclePct: number | null;
  boneKg: number | null;
  bmr: number | null;
  visceralFat: number | null;
  proteinPct: number | null;
  bodyAge: number | null;
  subcutaneousFatPct: number | null;
  skeletalMusclePct: number | null;
  fatFreeWeightKg: number | null;
  heartRate: number | null;
};

const RENPHO_SCALAR_FIELDS: Array<{
  key: keyof RenphoMeasurementScalars;
  read: (m: RenphoMeasurement) => number | null;
}> = [
  { key: 'weightKg', read: (m) => m.weight ?? null },
  { key: 'bmi', read: (m) => m.bmi ?? null },
  { key: 'bodyFatPct', read: (m) => m.bodyfat ?? null },
  { key: 'waterPct', read: (m) => m.water ?? null },
  { key: 'musclePct', read: (m) => m.muscle ?? null },
  { key: 'boneKg', read: (m) => m.bone ?? null },
  { key: 'bmr', read: (m) => m.bmr ?? null },
  { key: 'visceralFat', read: (m) => m.visceral_fat ?? null },
  { key: 'proteinPct', read: (m) => m.protein ?? null },
  { key: 'bodyAge', read: (m) => (isSet(m.body_age) ? Math.round(m.body_age) : null) },
  { key: 'subcutaneousFatPct', read: (m) => m.subcutaneous_fat ?? null },
  { key: 'skeletalMusclePct', read: (m) => m.skeletal_muscle ?? null },
  { key: 'fatFreeWeightKg', read: (m) => m.fat_free_weight ?? null },
  { key: 'heartRate', read: (m) => m.heart_rate ?? null },
];

function renphoMeasurementScalars(m: RenphoMeasurement): RenphoMeasurementScalars {
  const scalars = {} as RenphoMeasurementScalars;
  for (const field of RENPHO_SCALAR_FIELDS) {
    scalars[field.key] = field.read(m);
  }
  return scalars;
}

function measurementToPrisma(
  m: RenphoMeasurement,
): Omit<Prisma.BodyCompositionMeasurementUncheckedCreateInput, 'athleteId'> {
  return {
    source: BodyCompositionSource.RENPHO,
    externalId: m.id,
    measuredAt: new Date(m.time_stamp * 1000),
    ...renphoMeasurementScalars(m),
  };
}

interface QueueRenphoMeasurementInput {
  measurement: RenphoMeasurement;
  athleteId: string;
  existingIds: Set<string>;
  weightByDay: Map<string, RenphoMeasurement>;
  toCreate: Prisma.BodyCompositionMeasurementCreateManyInput[];
  updateOps: Promise<unknown>[];
}

function trackRenphoWeightByDay(
  measurement: RenphoMeasurement,
  weightByDay: Map<string, RenphoMeasurement>,
): void {
  const dayKey = format(new Date(measurement.time_stamp * 1000), 'yyyy-MM-dd');
  const prev = weightByDay.get(dayKey);
  if (!prev || measurement.time_stamp > prev.time_stamp) {
    weightByDay.set(dayKey, measurement);
  }
}

function queueRenphoMeasurement(input: QueueRenphoMeasurementInput): void {
  const { measurement, athleteId, existingIds, weightByDay, toCreate, updateOps } = input;
  const data = measurementToPrisma(measurement);
  trackRenphoWeightByDay(measurement, weightByDay);

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
    return;
  }

  toCreate.push({ ...data, athleteId } as Prisma.BodyCompositionMeasurementCreateManyInput);
}

/** Met à jour le poids du jour dans DailyHealth — sauf si Withings a déjà une pesée ce jour-là. */
async function upsertDailyWeightFromMeasurement(
  athleteId: string,
  m: RenphoMeasurement,
  withingsDays: Set<string>,
) {
  if (m.weight === undefined || m.weight === null) {
    return;
  }

  const local = new Date(m.time_stamp * 1000);
  const dayKey = format(local, 'yyyy-MM-dd');
  if (withingsDays.has(dayKey)) {
    return;
  }

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

async function persistRenphoMeasurements(input: {
  athleteId: string;
  measurements: RenphoMeasurement[];
}): Promise<{ imported: number; updated: number; weightByDay: Map<string, RenphoMeasurement> }> {
  const { athleteId, measurements } = input;
  const weightByDay = new Map<string, RenphoMeasurement>();
  if (measurements.length === 0) {
    return { imported: 0, updated: 0, weightByDay };
  }

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
    existingRows.map((r) => r.externalId).filter((id): id is string => isSet(id)),
  );

  const toCreate: Prisma.BodyCompositionMeasurementCreateManyInput[] = [];
  const updateOps: Promise<unknown>[] = [];

  for (const measurement of measurements) {
    queueRenphoMeasurement({
      measurement,
      athleteId,
      existingIds,
      weightByDay,
      toCreate,
      updateOps,
    });
  }

  let imported = 0;
  if (toCreate.length > 0) {
    const result = await prisma.bodyCompositionMeasurement.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
    imported = result.count;
  }

  let updated = 0;
  if (updateOps.length > 0) {
    await Promise.all(updateOps);
    updated = updateOps.length;
  }

  await Promise.all(measurements.map((m) => ingestRenphoMeasurement(athleteId, m)));
  return { imported, updated, weightByDay };
}

function fullRenphoSyncWindow() {
  const since = subDays(startOfDay(new Date()), 365 * 3);
  return {
    since,
    days: syncWindowDays(since),
    sinceTimestamp: undefined,
    limit: 2000,
  };
}

function partialRenphoSyncWindow(lastSyncAt: Date | null, days: number) {
  const since = syncSinceFromLastSync(lastSyncAt, days);
  const windowDays = syncWindowDays(since);
  return {
    since,
    days: windowDays,
    sinceTimestamp: Math.floor(since.getTime() / 1000),
    limit: Math.max(windowDays * 2, 100),
  };
}

function resolveRenphoSyncWindow(
  account: NonNullable<Awaited<ReturnType<typeof getRenphoAccount>>>,
  options?: { days?: number; full?: boolean },
) {
  if (options?.full) {
    return fullRenphoSyncWindow();
  }
  return partialRenphoSyncWindow(account.lastSyncAt, options?.days ?? 60);
}

async function finalizeRenphoSync(input: {
  athleteId: string;
  weightByDay: Map<string, RenphoMeasurement>;
  withingsDays: Set<string>;
  since: Date;
  full?: boolean;
  imported: number;
  updated: number;
  days: number;
}): Promise<RenphoSyncResult> {
  await Promise.all(
    [...input.weightByDay.values()].map((m) =>
      upsertDailyWeightFromMeasurement(input.athleteId, m, input.withingsDays),
    ),
  );
  await prisma.renphoAccount.update({
    where: { athleteId: input.athleteId },
    data: { lastSyncAt: new Date() },
  });
  const backfill = await backfillBodyCompositionObservationsFromMeasurements(input.athleteId, {
    since: input.full ? subDays(startOfDay(new Date()), 365 * 3) : input.since,
  });
  return {
    imported: input.imported,
    updated: input.updated,
    days: input.days,
    observationsBackfilled: backfill.ingested,
  };
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
    const window = resolveRenphoSyncWindow(account, options);
    const [measurements, withingsDays] = await Promise.all([
      client.getMeasurements({ sinceTimestamp: window.sinceTimestamp, limit: window.limit }),
      withingsWeighInDayKeys(athleteId, window.since),
    ]);
    const { imported, updated, weightByDay } = await persistRenphoMeasurements({
      athleteId,
      measurements,
    });
    return finalizeRenphoSync({
      athleteId,
      weightByDay,
      withingsDays,
      since: window.since,
      full: options?.full,
      imported,
      updated,
      days: window.days,
    });
  } catch (error) {
    if (isSecretAuthenticityFailure(error)) {
      throw error;
    }
    if (isDecryptMalformedSoftFailure(error) || isCredentialFailure(error)) {
      await revokeRenphoCredentials(athleteId);
      throw new ProviderAuthError(
        'Session Renpho expirée. Reconnecte Renpho dans les paramètres.',
        {
          cause: error,
        },
      );
    }
    throw error;
  }
}
