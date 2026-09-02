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
 * Auto-link (DB match) stays awaited on the sync / import path.
 * Compliance LLM analysis runs here via plannedSessionIdsToAnalyze.
 */
export function scheduleBackgroundTasks(params: {
  athleteId: string;
  activityIds: string[];
  regenerateBriefing: boolean;
  trainingDayId?: string;
  /** Planned sessions linked this turn — analyze off the critical path. */
  plannedSessionIdsToAnalyze?: string[];
}): void {
  const { athleteId, activityIds, regenerateBriefing, trainingDayId, plannedSessionIdsToAnalyze } =
    params;

  void runBackgroundTasks(params).catch((error) => {
    console.error('[athlete-state/background]', error);
  });
}

type BackgroundTaskParams = {
  athleteId: string;
  activityIds: string[];
  regenerateBriefing: boolean;
  trainingDayId?: string;
  plannedSessionIdsToAnalyze?: string[];
};

async function enrichTodayContext(athleteId: string): Promise<void> {
  try {
    const { enrichTodayActivitiesContext } =
      await import('@/lib/activity/detail/enrich-observed-context');
    await enrichTodayActivitiesContext(prisma, athleteId);
  } catch (error) {
    console.error('[athlete-state/background/enrich-today]', error);
  }
}

async function analyzeLinkedSessions(
  athleteId: string,
  plannedSessionIdsToAnalyze: string[],
): Promise<void> {
  try {
    const { analyzeLinkedPlannedSessions } =
      await import('@/lib/planned-session/linking/session-linking');
    await analyzeLinkedPlannedSessions(athleteId, plannedSessionIdsToAnalyze);
  } catch (error) {
    console.error('[athlete-state/background/compliance-analyze]', error);
  }
}

async function recomputeNeuromuscularIfNeeded(
  athleteId: string,
  activityIds: string[],
  dayId: string,
): Promise<void> {
  try {
    const { ensureStreamsForNeuromuscularEfficiency, shouldRecomputeNeuromuscularAdaptation } =
      await import('@/lib/streams/ensure-streams-for-neuromuscular');

    const streamResult = await ensureStreamsForNeuromuscularEfficiency(athleteId, {
      activityIds,
      trainingDayId: dayId,
    });
    const needsNmeRecompute =
      streamResult.withData > 0 ||
      streamResult.fetched > 0 ||
      (await shouldRecomputeNeuromuscularAdaptation(athleteId, dayId));

    if (!needsNmeRecompute) {
      return;
    }

    const { loadTodayState } = await import('@/lib/today/today-state-server');
    const todayState = await loadTodayState({
      athleteId,
      trainingDayId: dayId,
      forceRefresh: true,
    });
    await regenerateAthleteSnapshotAfterInference(athleteId, dayId, todayState);
  } catch (error) {
    console.error('[athlete-state/background/nme-streams]', error);
  }
}

async function runBackgroundTasks(params: BackgroundTaskParams): Promise<void> {
  const { athleteId, activityIds, regenerateBriefing, trainingDayId, plannedSessionIdsToAnalyze } =
    params;
  const dayId = trainingDayId ?? trainingDayIdNow();

  await enrichTodayContext(athleteId);

  if (plannedSessionIdsToAnalyze && plannedSessionIdsToAnalyze.length > 0) {
    await analyzeLinkedSessions(athleteId, plannedSessionIdsToAnalyze);
  }

  await recomputeNeuromuscularIfNeeded(athleteId, activityIds, dayId);

  if (activityIds.length > 0 && isCoachConfigured()) {
    const { athleteHasAiProcessingConsent } = await import('@/lib/privacy/consent-store');
    if (await athleteHasAiProcessingConsent(athleteId)) {
      const { runActivityNarrativeForIds } =
        await import('@/lib/activity/narrative/activity-narrative');
      await runActivityNarrativeForIds(athleteId, activityIds);
    }
  }

  if (regenerateBriefing) {
    const refDate = new Date(`${dayId}T12:00:00.000Z`);
    // Deterministic fallback when AI consent missing — Twin engines stay OK.
    await generateAndStoreDailyBriefing(athleteId, refDate);
    await regenerateAthleteSnapshotAfterBriefing(athleteId, dayId);
  }
}
