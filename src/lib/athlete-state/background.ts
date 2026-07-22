import { isCoachConfigured } from '@/lib/ai';
import { generateAndStoreDailyBriefing } from '@/lib/briefing/daily-briefing';
import { regenerateAthleteSnapshotAfterBriefing } from '@/lib/athlete-state/snapshot-service';
import { prisma } from '@/lib/prisma';

/**
 * Background path — never blocks the fast inference response.
 * Failures are logged; tasks are idempotent.
 */
export function scheduleBackgroundTasks(params: {
  activityIds: string[];
  regenerateBriefing: boolean;
  trainingDayId?: string;
}): void {
  const { activityIds, regenerateBriefing, trainingDayId } = params;

  void runBackgroundTasks(activityIds, regenerateBriefing, trainingDayId).catch((error) => {
    console.error('[athlete-state/background]', error);
  });
}

async function runBackgroundTasks(
  activityIds: string[],
  regenerateBriefing: boolean,
  trainingDayId?: string,
): Promise<void> {
  // Outdoor weather for today's sessions — event-driven, not on every activities GET.
  try {
    const { enrichTodayActivitiesContext } = await import('@/lib/activity/enrich-observed-context');
    await enrichTodayActivitiesContext(prisma);
  } catch (error) {
    console.error('[athlete-state/background/enrich-today]', error);
  }

  if (activityIds.length > 0) {
    const { autoLinkActivities } = await import('@/lib/planned-session/session-linking');
    await autoLinkActivities(activityIds);

    if (isCoachConfigured()) {
      const { runActivityNarrativeForIds } = await import('@/lib/activity/activity-narrative');
      await runActivityNarrativeForIds(activityIds);
    }
  }

  if (regenerateBriefing && isCoachConfigured()) {
    const refDate = trainingDayId ? new Date(`${trainingDayId}T12:00:00.000Z`) : new Date();
    await generateAndStoreDailyBriefing(refDate);
    await regenerateAthleteSnapshotAfterBriefing(trainingDayId);
  }
}
