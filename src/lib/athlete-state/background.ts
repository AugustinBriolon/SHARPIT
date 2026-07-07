import { isCoachConfigured } from '@/lib/ai';
import { generateAndStoreDailyBriefing } from '@/lib/daily-briefing';
import { regenerateAthleteSnapshotAfterBriefing } from '@/lib/athlete-state/snapshot-service';

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
  if (activityIds.length > 0) {
    const { autoLinkActivities } = await import('@/lib/session-linking');
    await autoLinkActivities(activityIds);

    if (isCoachConfigured()) {
      const { runActivityNarrativeForIds } = await import('@/lib/activity-narrative');
      await runActivityNarrativeForIds(activityIds);
    }
  }

  if (regenerateBriefing && isCoachConfigured()) {
    const refDate = trainingDayId ? new Date(`${trainingDayId}T12:00:00.000Z`) : new Date();
    await generateAndStoreDailyBriefing(refDate);
    await regenerateAthleteSnapshotAfterBriefing(trainingDayId);
  }
}
