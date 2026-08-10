import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import type { DataProvider } from '@/core/athlete-state/events';
import { createEventId, createTraceId, type AthleteStateEvent } from '@/core/athlete-state/events';
import type { TodayState } from '@/hooks/use-today';
import { scheduleBackgroundTasks } from '@/lib/athlete-state/background';
import {
  computeFreshnessSnapshot,
  providersNeedingSync,
  shouldSyncOnOpen,
  trainingDayIdNow,
} from '@/lib/athlete-state/freshness-service';
import { regenerateAthleteSnapshotAfterInference } from '@/lib/athlete-state/snapshot-service';
import { syncProviders, type ProviderSyncResult } from '@/lib/athlete-state/sync-providers';
import { getLatestAthleteSnapshot } from '@/infrastructure/athlete-state/snapshot-repository';
import { loadTodayState } from '@/lib/today/today-state-server';
import { prisma } from '@/lib/prisma';
import { updateRecordsForTypesSafe } from '@/lib/training/records';

const ATHLETE_ID = 'default';

export type AthleteStateRefreshResult = {
  traceId: string;
  trainingDayId: string;
  freshness: Awaited<ReturnType<typeof computeFreshnessSnapshot>>;
  athleteSnapshot: AthleteSnapshot;
  /** @deprecated Use athleteSnapshot — kept for backward compatibility */
  todayState: TodayState;
  syncedProviders: DataProvider[];
  inferenceRan: boolean;
  /** True when regenerate produced a new snapshot fingerprint. */
  snapshotChanged: boolean;
};

/**
 * Decide whether open-path inference must recompute Twin engines.
 * Soft app opens reuse cached Twin outputs; sync / manual / cron force recompute.
 */
export function shouldForceInferenceOnRefresh(input: {
  source?: 'app_shell' | 'today_refresh' | 'cron';
  forceSync?: boolean;
  syncedProviderCount: number;
}): boolean {
  if (input.forceSync) return true;
  if (input.source === 'today_refresh' || input.source === 'cron') return true;
  if (input.syncedProviderCount > 0) return true;
  return false;
}

/**
 * Soft app_shell opens with an unchanged Twin fingerprint can skip rebuilding
 * Today presentation (client keeps React Query cache). Always rebuild after
 * sync, manual refresh, or a new morning proposal.
 */
export function shouldSkipTodayPresentationRebuild(input: {
  source?: 'app_shell' | 'today_refresh' | 'cron';
  forceSync?: boolean;
  syncedProviderCount: number;
  snapshotChanged: boolean;
  morningRecalibrationCreated: boolean;
}): boolean {
  if (input.forceSync) return false;
  if (input.source !== 'app_shell') return false;
  if (input.syncedProviderCount > 0) return false;
  if (input.snapshotChanged) return false;
  if (input.morningRecalibrationCreated) return false;
  return true;
}

async function autoLinkAndCollectSessionIds(activityIds: string[]): Promise<string[]> {
  if (activityIds.length === 0) return [];
  try {
    const { autoLinkActivities } = await import('@/lib/planned-session/session-linking');
    const result = await autoLinkActivities(activityIds);
    return result.sessionIds;
  } catch (error) {
    console.error('[athlete-state/auto-link]', error);
    return [];
  }
}

/**
 * ApplicationOpened — athlete-centric refresh.
 * Sync only what is needed; force Twin recompute only when evidence changed or asked.
 *
 * Freshness is computed twice only: once to decide sync, once for the response
 * (mid-sync / mid-compute snapshots were never returned to the client).
 */
export async function refreshAthleteState(options?: {
  trainingDayId?: string;
  source?: 'app_shell' | 'today_refresh' | 'cron';
  forceSync?: boolean;
  skipSync?: boolean;
}): Promise<AthleteStateRefreshResult> {
  const traceId = createTraceId();
  const trainingDayId = options?.trainingDayId ?? trainingDayIdNow();

  let freshness = await computeFreshnessSnapshot({ trainingDayId, athleteId: ATHLETE_ID });

  const syncedProviders: DataProvider[] = [];
  let activityIds: string[] = [];

  if (!options?.skipSync && (options?.forceSync || shouldSyncOnOpen(freshness))) {
    const toSync = providersNeedingSync(freshness, { force: options?.forceSync }) as DataProvider[];
    const results = await syncProviders(toSync);
    for (const r of results) {
      syncedProviders.push(r.provider);
      activityIds.push(...r.activityIds);
    }
  }

  const forceRefresh = shouldForceInferenceOnRefresh({
    source: options?.source,
    forceSync: options?.forceSync,
    syncedProviderCount: syncedProviders.length,
  });

  const priorSnapshot = await getLatestAthleteSnapshot({
    athleteId: ATHLETE_ID,
    trainingDayId,
  });
  const priorSnapshotId = priorSnapshot?.snapshotId ?? null;

  const todayState = await runFastInference(trainingDayId, { forceRefresh });
  const athleteSnapshot = await regenerateAthleteSnapshotAfterInference(trainingDayId, todayState);
  const snapshotChanged = priorSnapshotId !== athleteSnapshot.snapshotId;

  freshness = await computeFreshnessSnapshot({ trainingDayId, athleteId: ATHLETE_ID });

  const needsBriefing = freshness.domains.some(
    (d) => d.domain === 'recommendations' && d.freshness !== 'fresh',
  );

  const plannedSessionIdsToAnalyze = await autoLinkAndCollectSessionIds(activityIds);
  scheduleBackgroundTasks({
    activityIds,
    regenerateBriefing: needsBriefing,
    trainingDayId,
    plannedSessionIdsToAnalyze,
  });

  return {
    traceId,
    trainingDayId,
    freshness,
    athleteSnapshot,
    todayState,
    syncedProviders,
    inferenceRan: true,
    snapshotChanged,
  };
}

export async function onProviderSyncCompleted(
  results: ProviderSyncResult[],
  trainingDayId?: string,
  options?: { skipRecordUpdate?: boolean },
): Promise<AthleteSnapshot> {
  const dayId = trainingDayId ?? trainingDayIdNow();
  const activityIds = results.flatMap((r) => r.activityIds);

  if (!options?.skipRecordUpdate && activityIds.length > 0) {
    const activities = await prisma.activity.findMany({
      where: { id: { in: activityIds } },
      select: { type: true },
    });
    const types = [...new Set(activities.map((a) => a.type))];
    await updateRecordsForTypesSafe(types);
  }

  // Await DB link only — compliance LLM runs in scheduleBackgroundTasks.
  const plannedSessionIdsToAnalyze = await autoLinkAndCollectSessionIds(activityIds);

  const todayState = await runFastInference(dayId);
  const athleteSnapshot = await regenerateAthleteSnapshotAfterInference(dayId, todayState);
  scheduleBackgroundTasks({
    activityIds,
    regenerateBriefing: true,
    trainingDayId: dayId,
    plannedSessionIdsToAnalyze,
  });
  return athleteSnapshot;
}

export async function onWellnessSubmitted(trainingDayId: string): Promise<AthleteSnapshot> {
  const todayState = await runFastInference(trainingDayId);
  return regenerateAthleteSnapshotAfterInference(trainingDayId, todayState);
}

async function runFastInference(
  trainingDayId: string,
  options?: { forceRefresh?: boolean },
): Promise<TodayState> {
  return loadTodayState({
    athleteId: ATHLETE_ID,
    trainingDayId,
    // Event-driven paths (activity/wellness/explicit inference) default to recompute.
    forceRefresh: options?.forceRefresh ?? true,
  });
}

export async function handleAthleteStateEvent(event: AthleteStateEvent): Promise<void> {
  console.info('[athlete-state/event]', event.kind, event.traceId);

  switch (event.kind) {
    case 'ApplicationOpened':
      await refreshAthleteState({
        trainingDayId: event.trainingDayId,
        source: event.source,
      });
      break;
    case 'ManualWellnessSubmitted':
      await onWellnessSubmitted(event.trainingDayId);
      break;
    case 'ActivityImported':
      {
        const plannedSessionIdsToAnalyze = await autoLinkAndCollectSessionIds([
          ...event.activityIds,
        ]);
        const todayState = await runFastInference(event.trainingDayId);
        await regenerateAthleteSnapshotAfterInference(event.trainingDayId, todayState);
        scheduleBackgroundTasks({
          activityIds: [...event.activityIds],
          regenerateBriefing: event.activityIds.length > 0,
          trainingDayId: event.trainingDayId,
          plannedSessionIdsToAnalyze,
        });
      }
      break;
    case 'InferenceRequested':
      if (event.mode === 'fast') {
        const todayState = await runFastInference(event.trainingDayId);
        await regenerateAthleteSnapshotAfterInference(event.trainingDayId, todayState);
      }
      break;
    default:
      break;
  }
}

export function logAthleteStateEvent(
  kind: AthleteStateEvent['kind'],
  trainingDayId: string,
  extra?: Record<string, unknown>,
): void {
  console.info('[athlete-state]', kind, {
    eventId: createEventId(kind),
    traceId: createTraceId(),
    trainingDayId,
    ...extra,
  });
}
