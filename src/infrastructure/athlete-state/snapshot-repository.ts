import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import { prisma } from '@/lib/prisma';

export async function getLatestAthleteSnapshot(params: {
  athleteId: string;
  trainingDayId: string;
}): Promise<AthleteSnapshot | null> {
  const row = await prisma.athleteSnapshotRecord.findUnique({
    where: {
      athleteId_trainingDayId: {
        athleteId: params.athleteId,
        trainingDayId: params.trainingDayId,
      },
    },
  });

  if (!row) return null;
  return row.payload as unknown as AthleteSnapshot;
}

export async function saveAthleteSnapshot(snapshot: AthleteSnapshot): Promise<AthleteSnapshot> {
  await prisma.athleteSnapshotRecord.upsert({
    where: {
      athleteId_trainingDayId: {
        athleteId: snapshot.athleteId,
        trainingDayId: snapshot.trainingDayId,
      },
    },
    create: {
      athleteId: snapshot.athleteId,
      trainingDayId: snapshot.trainingDayId,
      snapshotId: snapshot.snapshotId,
      payload: snapshot as object,
      generatedAt: new Date(snapshot.generatedAt),
    },
    update: {
      snapshotId: snapshot.snapshotId,
      payload: snapshot as object,
      generatedAt: new Date(snapshot.generatedAt),
    },
  });

  return snapshot;
}

export async function getSnapshotByFingerprint(
  athleteId: string,
  trainingDayId: string,
  snapshotId: string,
): Promise<AthleteSnapshot | null> {
  const row = await prisma.athleteSnapshotRecord.findUnique({
    where: {
      athleteId_trainingDayId: { athleteId, trainingDayId },
    },
  });
  if (!row || row.snapshotId !== snapshotId) return null;
  return row.payload as unknown as AthleteSnapshot;
}
