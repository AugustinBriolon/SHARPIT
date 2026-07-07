import type { AthleteStateDomain } from '@/core/athlete-state/freshness';
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
import { loadTodayState } from '@/lib/today-state-server';

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
};

type OrchestratorRunContext = {
  traceId: string;
  trainingDayId: string;
  syncing: Record<string, boolean>;
  computing: Partial<Record<AthleteStateDomain, boolean>>;
};

/**
 * ApplicationOpened — athlete-centric refresh.
 * Sync only what is needed, infer on the fast path, defer heavy work.
 */
export async function refreshAthleteState(options?: {
  trainingDayId?: string;
  source?: 'app_shell' | 'today_refresh' | 'cron';
  forceSync?: boolean;
  skipSync?: boolean;
}): Promise<AthleteStateRefreshResult> {
  const traceId = createTraceId();
  const trainingDayId = options?.trainingDayId ?? trainingDayIdNow();
  const ctx: OrchestratorRunContext = {
    traceId,
    trainingDayId,
    syncing: {},
    computing: {},
  };

  let freshness = await computeFreshnessSnapshot({ trainingDayId, athleteId: ATHLETE_ID });

  const syncedProviders: DataProvider[] = [];
  let activityIds: string[] = [];

  if (!options?.skipSync && (options?.forceSync || shouldSyncOnOpen(freshness))) {
    const toSync = providersNeedingSync(freshness, { force: options?.forceSync }) as DataProvider[];

    for (const p of toSync) {
      ctx.syncing[p] = true;
    }
    freshness = await computeFreshnessSnapshot({
      trainingDayId,
      athleteId: ATHLETE_ID,
      syncing: ctx.syncing,
    });

    const results = await syncProviders(toSync);
    for (const r of results) {
      syncedProviders.push(r.provider);
      activityIds.push(...r.activityIds);
    }
  }

  ctx.computing = {
    recovery: true,
    training: true,
    sleep: true,
    reasoning: true,
  };
  freshness = await computeFreshnessSnapshot({
    trainingDayId,
    athleteId: ATHLETE_ID,
    computing: ctx.computing,
  });

  const todayState = await runFastInference(trainingDayId);
  const athleteSnapshot = await regenerateAthleteSnapshotAfterInference(trainingDayId, todayState);

  freshness = await computeFreshnessSnapshot({ trainingDayId, athleteId: ATHLETE_ID });

  const needsBriefing = freshness.domains.some(
    (d) => d.domain === 'recommendations' && d.freshness !== 'fresh',
  );
  scheduleBackgroundTasks({ activityIds, regenerateBriefing: needsBriefing, trainingDayId });

  return {
    traceId,
    trainingDayId,
    freshness,
    athleteSnapshot,
    todayState,
    syncedProviders,
    inferenceRan: true,
  };
}

export async function onProviderSyncCompleted(
  results: ProviderSyncResult[],
  trainingDayId?: string,
): Promise<AthleteSnapshot> {
  const dayId = trainingDayId ?? trainingDayIdNow();
  const activityIds = results.flatMap((r) => r.activityIds);
  const todayState = await runFastInference(dayId);
  const athleteSnapshot = await regenerateAthleteSnapshotAfterInference(dayId, todayState);
  scheduleBackgroundTasks({ activityIds, regenerateBriefing: true, trainingDayId: dayId });
  return athleteSnapshot;
}

export async function onWellnessSubmitted(trainingDayId: string): Promise<AthleteSnapshot> {
  const todayState = await runFastInference(trainingDayId);
  return regenerateAthleteSnapshotAfterInference(trainingDayId, todayState);
}

async function runFastInference(trainingDayId: string): Promise<TodayState> {
  return loadTodayState({
    athleteId: ATHLETE_ID,
    trainingDayId,
    forceRefresh: true,
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
        const todayState = await runFastInference(event.trainingDayId);
        await regenerateAthleteSnapshotAfterInference(event.trainingDayId, todayState);
      }
      scheduleBackgroundTasks({
        activityIds: [...event.activityIds],
        regenerateBriefing: event.activityIds.length > 0,
        trainingDayId: event.trainingDayId,
      });
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
