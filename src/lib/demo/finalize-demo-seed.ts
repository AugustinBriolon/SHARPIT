import { format, startOfDay } from 'date-fns';
import type { PrismaClient } from '@prisma/client';
import { getOrBuildAthleteSnapshot } from '@/lib/athlete-state/snapshot-service';
import { backfillBodyCompositionObservationsFromMeasurements } from '@/lib/integrations/shared/body-composition-observation-backfill';
import { backfillHealthObservationsFromDailyHealth } from '@/lib/integrations/shared/health-observation-backfill';
import { activityInclude } from '@/lib/queries/activity-include';
import { syncManualActivityObservations } from '@/lib/manual-observation-sync';

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

/** Backfill observations + rebuild today's snapshot so load/recovery/adapt pages work. */
export async function finalizeDemoSeed(prisma: PrismaClient, athleteId: string): Promise<void> {
  await backfillHealthObservationsFromDailyHealth(athleteId, { days: 30 });
  await backfillBodyCompositionObservationsFromMeasurements(athleteId, { days: 90 });

  const activities = await prisma.activity.findMany({
    where: { athleteId },
    include: activityInclude,
    orderBy: { date: 'asc' },
  });
  for (const activity of activities) {
    await syncManualActivityObservations(activity);
  }

  const trainingDayId = format(startOfDay(new Date()), 'yyyy-MM-dd');
  await getOrBuildAthleteSnapshot(athleteId, trainingDayId);
}
