import type { PrismaClient } from '@prisma/client';
import { generateAthleteSnapshot } from '@sharpit/server/lib/athlete-state/snapshot-service';
import { demoAnchorTrainingDayId } from '@sharpit/server/lib/demo/demo-calendar';
import { backfillBodyCompositionObservationsFromMeasurements } from '@sharpit/server/lib/integrations/shared/body-composition-observation-backfill';
import { backfillHealthObservationsFromDailyHealth } from '@sharpit/server/lib/integrations/shared/health-observation-backfill';
import { activityDetailInclude } from '@sharpit/server/lib/queries/activity-include';
import { syncManualActivityObservations } from '@sharpit/server/lib/observation/manual-observation-sync';

/** Purge derived inference state so a reseed never inherits stale twin/features. */
export async function purgeDemoDerivedState(
  prisma: PrismaClient,
  athleteId: string,
): Promise<void> {
  await prisma.observation.deleteMany({ where: { athleteId } });
  await prisma.featureSet.deleteMany({ where: { athleteId } });
  await prisma.athleteSnapshotRecord.deleteMany({ where: { athleteId } });
  await prisma.digitalTwin.deleteMany({ where: { athleteId } });
  await prisma.physicalNote.deleteMany({ where: { athleteId } });
}

/**
 * Backfill observations + force-rebuild today's snapshot.
 * forceRefresh clears twin recovery BASELINE_PENDING left by a racey first land.
 */
export async function finalizeDemoSeed(prisma: PrismaClient, athleteId: string): Promise<void> {
  await backfillHealthObservationsFromDailyHealth(athleteId, { days: 30 });
  await backfillBodyCompositionObservationsFromMeasurements(athleteId, { days: 90 });

  const activities = await prisma.activity.findMany({
    where: { athleteId },
    include: activityDetailInclude,
    orderBy: { date: 'asc' },
  });
  for (const activity of activities) {
    await syncManualActivityObservations(activity);
  }

  const trainingDayId = demoAnchorTrainingDayId();
  // Drop stale twin + today's snapshot so forceRefresh cannot reuse BASELINE_PENDING.
  await prisma.athleteSnapshotRecord.deleteMany({
    where: { athleteId, trainingDayId },
  });
  await prisma.digitalTwin.deleteMany({
    where: { athleteId },
  });
  await generateAthleteSnapshot({
    athleteId,
    trainingDayId,
    forceRefresh: true,
  });
}
