import type { QueryClient } from '@tanstack/react-query';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { queryKeys } from '@/lib/query/keys';

export type ShellRefreshSeed = {
  trainingDayId: string;
  athleteSnapshot?: unknown;
  todayState?: unknown;
  todayPresentation?: TodayViewModel | null;
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

export function peekShellAthleteRefreshInFlight(): Promise<ShellRefreshSeed | null> | null {
  return inFlight;
}

export function ensureShellAthleteRefresh(
  queryClient: QueryClient,
  trainingDayId: string,
): Promise<ShellRefreshSeed | null> {
  if (inFlight) return inFlight;

  inFlight = (async (): Promise<ShellRefreshSeed | null> => {
    try {
      const res = await fetch(`/api/athlete-state/refresh?trainingDayId=${trainingDayId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'app_shell' }),
      });
      if (!res.ok) return null;

      const data = (await res.json()) as {
        athleteSnapshot?: unknown;
        todayState?: unknown;
        todayPresentation?: TodayViewModel | null;
      };

      if (data.athleteSnapshot) {
        queryClient.setQueryData(queryKeys.athleteSnapshot(trainingDayId), {
          snapshot: data.athleteSnapshot,
          isRefreshing: false,
        });
      }
      if (data.todayState) {
        queryClient.setQueryData(queryKeys.today(trainingDayId), data.todayState);
      }
      if (data.todayPresentation) {
        queryClient.setQueryData(
          queryKeys.presentationToday(trainingDayId),
          data.todayPresentation,
        );
      }
      if (!data.athleteSnapshot) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.athleteSnapshot(trainingDayId),
        });
      }

      return {
        trainingDayId,
        athleteSnapshot: data.athleteSnapshot,
        todayState: data.todayState,
        todayPresentation: data.todayPresentation ?? null,
      };
    } catch {
      return null;
    } finally {
      // Keep the settled promise so late joiners still skip a raced GET;
      // clear on next tick so manual invalidations can refetch normally.
      queueMicrotask(() => {
        inFlight = null;
      });
    }
  })();

  return inFlight;
}
