import type { PrismaClient } from '@prisma/client';
import {
  ACTIVITY_STATUS_DEFAULT,
  type ActivityStatusId,
  type ActivityStatusRetention,
  type ActivityStatusStore,
  type ActivityStatusWriteInput,
  defaultRetentionForStatus,
  isActivityStatus,
  resolveActivityStatusStore,
  todayIsoDate,
} from '@/lib/health/activity-status';
import { toUtcDateOnly } from '@/lib/travel-context/calendar-date';

function isoDateFromDb(value: Date | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString().slice(0, 10);
}

function retentionFromRow(row: {
  retentionKind: string;
  untilDate: Date | null;
}): ActivityStatusRetention {
  if (row.retentionKind === 'until_date') {
    const untilDate = isoDateFromDb(row.untilDate);
    if (untilDate) {
      return { kind: 'until_date', untilDate };
    }
  }
  return { kind: 'until_modified' };
}

export function rowToActivityStatusStore(row: {
  status: string;
  retentionKind: string;
  untilDate: Date | null;
  travelId: string | null;
  updatedAt: Date;
}): ActivityStatusStore {
  const status = isActivityStatus(row.status) ? row.status : ACTIVITY_STATUS_DEFAULT;
  return resolveActivityStatusStore({
    version: 2,
    status,
    retention: status === 'active' ? { kind: 'until_modified' } : retentionFromRow(row),
    travelId: status === 'paused' ? row.travelId : null,
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function getActivityStatusStoreDb(
  prisma: PrismaClient,
  athleteId: string,
  today: string = todayIsoDate(),
): Promise<ActivityStatusStore> {
  const row = await prisma.athleteActivityStatus.findUnique({ where: { athleteId } });
  if (!row) {
    return {
      version: 2,
      status: ACTIVITY_STATUS_DEFAULT,
      retention: { kind: 'until_modified' },
      travelId: null,
      updatedAt: '1970-01-01T00:00:00.000Z',
    };
  }
  const store = rowToActivityStatusStore(row);
  const resolved = resolveActivityStatusStore(store, today);
  if (resolved.status !== store.status) {
    return setActivityStatusDb(prisma, athleteId, { status: 'active' });
  }
  return resolved;
}

function resolveWriteFields(input: ActivityStatusWriteInput): {
  status: ActivityStatusId;
  retention: ActivityStatusRetention;
  travelId: string | null;
  untilDate: Date | null;
} {
  const { status } = input;
  const retention =
    status === 'active'
      ? ({ kind: 'until_modified' } as const)
      : (input.retention ?? defaultRetentionForStatus(status));
  const travelId = status === 'paused' ? (input.travelId ?? null) : null;
  const untilDate =
    retention.kind === 'until_date'
      ? toUtcDateOnly(new Date(`${retention.untilDate}T00:00:00.000Z`))
      : null;
  return { status, retention, travelId, untilDate };
}

async function closeOpenHistoryRows(
  prisma: PrismaClient,
  athleteId: string,
  now: Date,
): Promise<void> {
  await prisma.athleteActivityStatusHistory.updateMany({
    where: { athleteId, endedAt: null },
    data: { endedAt: now },
  });
}

type HistoryRowWrite = {
  athleteId: string;
  status: ActivityStatusId;
  retention: ActivityStatusRetention;
  untilDate: Date | null;
  travelId: string | null;
  now: Date;
};

async function createHistoryRow(prisma: PrismaClient, row: HistoryRowWrite): Promise<void> {
  await prisma.athleteActivityStatusHistory.create({
    data: {
      athleteId: row.athleteId,
      status: row.status,
      retentionKind: row.retention.kind,
      untilDate: row.untilDate,
      travelId: row.travelId,
      startedAt: row.now,
      endedAt: null,
    },
  });
}

async function refreshOpenHistoryRow(
  prisma: PrismaClient,
  athleteId: string,
  row: Pick<HistoryRowWrite, 'retention' | 'untilDate' | 'travelId'>,
): Promise<void> {
  await prisma.athleteActivityStatusHistory.updateMany({
    where: { athleteId, endedAt: null },
    data: {
      retentionKind: row.retention.kind,
      untilDate: row.untilDate,
      travelId: row.travelId,
    },
  });
}

export async function setActivityStatusDb(
  prisma: PrismaClient,
  athleteId: string,
  input: ActivityStatusWriteInput,
): Promise<ActivityStatusStore> {
  const { status, retention, travelId, untilDate } = resolveWriteFields(input);
  const now = new Date();

  const existing = await prisma.athleteActivityStatus.findUnique({ where: { athleteId } });
  const statusChanged = !existing || existing.status !== status;

  if (statusChanged) {
    await closeOpenHistoryRows(prisma, athleteId, now);
    await createHistoryRow(prisma, {
      athleteId,
      status,
      retention,
      untilDate,
      travelId,
      now,
    });
  }

  const row = await prisma.athleteActivityStatus.upsert({
    where: { athleteId },
    create: {
      athleteId,
      status,
      retentionKind: retention.kind,
      untilDate,
      travelId,
    },
    update: {
      status,
      retentionKind: retention.kind,
      untilDate,
      travelId,
    },
  });

  if (!statusChanged) {
    await refreshOpenHistoryRow(prisma, athleteId, { retention, untilDate, travelId });
  }

  return rowToActivityStatusStore(row);
}
