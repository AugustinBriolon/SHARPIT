import { isCoachConfigured } from '@/lib/ai';
import { generateAndStoreDailyBriefing } from '@/lib/briefing/daily-briefing';
import {
  regenerateAthleteSnapshotAfterBriefing,
  regenerateAthleteSnapshotAfterInference,
} from '@/lib/athlete-state/snapshot-service';
import { trainingDayIdNow } from '@/lib/athlete-state/freshness-service';
import { prisma } from '@/lib/prisma';

/**
 * Background path — never blocks the fast inference response.
 * Failures are logged; tasks are idempotent.
 *
 * Auto-link is intentionally NOT here: it runs awaited on the sync / import path
 * so the client sees the link when the API returns (weather/LLM used to delay it).
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
  const dayId = trainingDayId ?? trainingDayIdNow();

  try {
    const { enrichTodayActivitiesContext } = await import('@/lib/activity/enrich-observed-context');
    await enrichTodayActivitiesContext(prisma);
  } catch (error) {
    console.error('[athlete-state/background/enrich-today]', error);
  }

  // Streams → hrDrift → neuromuscular efficiency (no need to open the activity).
  try {
    const { ensureStreamsForNeuromuscularEfficiency, shouldRecomputeNeuromuscularAdaptation } =
      await import('@/lib/streams/ensure-streams-for-neuromuscular');

    const streamResult = await ensureStreamsForNeuromuscularEfficiency({
      activityIds,
      trainingDayId: dayId,
    });
    const needsNmeRecompute =
      streamResult.withData > 0 ||
      streamResult.fetched > 0 ||
      (await shouldRecomputeNeuromuscularAdaptation(dayId));

    if (needsNmeRecompute) {
      const { loadTodayState } = await import('@/lib/today/today-state-server');
      const todayState = await loadTodayState({
        athleteId: 'default',
        trainingDayId: dayId,
        forceRefresh: true,
      });
      await regenerateAthleteSnapshotAfterInference(dayId, todayState);
    }
  } catch (error) {
    console.error('[athlete-state/background/nme-streams]', error);
  }

  if (activityIds.length > 0 && isCoachConfigured()) {
    const { runActivityNarrativeForIds } = await import('@/lib/activity/activity-narrative');
    await runActivityNarrativeForIds(activityIds);
  }

  if (regenerateBriefing && isCoachConfigured()) {
    const refDate = new Date(`${dayId}T12:00:00.000Z`);
    await generateAndStoreDailyBriefing(refDate);
    await regenerateAthleteSnapshotAfterBriefing(dayId);
  }
}
