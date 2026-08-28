import type { QueryClient } from '@tanstack/react-query';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { queryKeys } from '@/lib/query/keys';

export type ShellRefreshSeed = {
  trainingDayId: string;
  athleteSnapshot?: unknown;
  todayState?: unknown;
  todayPresentation?: TodayViewModel | null;
  /** Soft open kept prior presentation — joiners should reuse RQ cache, not GET. */
  presentationSkipped?: boolean;
};

/**
 * Dedupes the silent app-shell POST /api/athlete-state/refresh so Today GET
 * can await the same in-flight work and skip a duplicate presentation fetch
 * when the refresh already returns todayPresentation.
 *
 * Offline / ADR-008: failures resolve to null; callers fall back to their
 * normal fetch or offline snapshot path.
 */
let inFlight: Promise<ShellRefreshSeed | null> | null = null;
let lastStartedAtMs = 0;

/** Minimum gap between visibility-triggered refreshes (open path is immediate). */
export const SHELL_REFRESH_MIN_INTERVAL_MS = 15 * 60 * 1000;

export function peekShellAthleteRefreshInFlight(): Promise<ShellRefreshSeed | null> | null {
  return inFlight;
}

function cacheShellRefreshData(
  queryClient: QueryClient,
  trainingDayId: string,
  data: {
    athleteSnapshot?: unknown;
    todayState?: unknown;
    todayPresentation?: TodayViewModel | null;
    presentationSkipped?: boolean;
  },
): TodayViewModel | null {
  if (data.athleteSnapshot) {
    queryClient.setQueryData(queryKeys.athleteSnapshot(trainingDayId), {
      snapshot: data.athleteSnapshot,
      isRefreshing: false,
    });
  }
  if (data.todayState) {
    queryClient.setQueryData(queryKeys.today(trainingDayId), data.todayState);
  }

  let todayPresentation = data.todayPresentation ?? null;
  if (data.presentationSkipped && (todayPresentation === undefined || todayPresentation === null)) {
    todayPresentation =
      queryClient.getQueryData<TodayViewModel>(queryKeys.presentationToday(trainingDayId)) ?? null;
  } else if (todayPresentation) {
    queryClient.setQueryData(queryKeys.presentationToday(trainingDayId), todayPresentation);
  }

  return todayPresentation;
}

async function fetchShellRefreshSeed(
  queryClient: QueryClient,
  trainingDayId: string,
): Promise<ShellRefreshSeed | null> {
  const res = await fetch(`/api/athlete-state/refresh?trainingDayId=${trainingDayId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'app_shell' }),
  });
  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as {
    athleteSnapshot?: unknown;
    todayState?: unknown;
    todayPresentation?: TodayViewModel | null;
    presentationSkipped?: boolean;
  };

  const todayPresentation = cacheShellRefreshData(queryClient, trainingDayId, data);

  if (!data.athleteSnapshot) {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.athleteSnapshot(trainingDayId),
    });
  }

  return {
    trainingDayId,
    athleteSnapshot: data.athleteSnapshot,
    todayState: data.todayState,
    todayPresentation,
    presentationSkipped: data.presentationSkipped === true,
  };
}

export function ensureShellAthleteRefresh(
  queryClient: QueryClient,
  trainingDayId: string,
  options?: { minIntervalMs?: number },
): Promise<ShellRefreshSeed | null> {
  if (inFlight) {
    return inFlight;
  }

  const minInterval = options?.minIntervalMs ?? 0;
  if (minInterval > 0 && lastStartedAtMs > 0 && Date.now() - lastStartedAtMs < minInterval) {
    return Promise.resolve(null);
  }

  lastStartedAtMs = Date.now();
  inFlight = (async (): Promise<ShellRefreshSeed | null> => {
    try {
      return await fetchShellRefreshSeed(queryClient, trainingDayId);
    } catch {
      return null;
    } finally {
      queueMicrotask(() => {
        inFlight = null;
      });
    }
  })();

  return inFlight;
}
