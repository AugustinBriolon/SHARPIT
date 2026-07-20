import type { QueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { queryKeys } from '@/lib/query/keys';

/** Delay for autoLinkActivities / background planned→activity linking after sync API returns. */
export const PROVIDER_SYNC_LINK_SETTLE_MS = 1800;

export type InvalidateAfterProviderSyncOptions = {
  /** Include body-composition caches (Withings / Renpho / sync-all). Default true. */
  includeBodyComposition?: boolean;
  /**
   * Second invalidation after background session linking.
   * Pass 0 to skip (tests). Default {@link PROVIDER_SYNC_LINK_SETTLE_MS}.
   */
  deferMs?: number;
  /** Override local training day (default: today). */
  trainingDayId?: string;
};

/**
 * Soft-refresh athlete-facing caches after a provider sync toast succeeds.
 * Covers Today / Training / physio presentation — not just activities/records.
 */
export async function invalidateAfterProviderSync(
  queryClient: QueryClient,
  options: InvalidateAfterProviderSyncOptions = {},
): Promise<void> {
  const {
    includeBodyComposition = true,
    deferMs = PROVIDER_SYNC_LINK_SETTLE_MS,
    trainingDayId = format(new Date(), 'yyyy-MM-dd'),
  } = options;

  await invalidateProviderSyncCaches(queryClient, {
    includeBodyComposition,
    trainingDayId,
  });

  if (deferMs > 0 && typeof window !== 'undefined') {
    window.setTimeout(() => {
      void invalidateProviderSyncCaches(queryClient, {
        includeBodyComposition: false,
        trainingDayId,
      });
    }, deferMs);
  }
}

async function invalidateProviderSyncCaches(
  queryClient: QueryClient,
  options: { includeBodyComposition: boolean; trainingDayId: string },
): Promise<void> {
  const { includeBodyComposition, trainingDayId } = options;

  const tasks: Promise<unknown>[] = [
    queryClient.invalidateQueries({ queryKey: queryKeys.activities }),
    queryClient.invalidateQueries({ queryKey: queryKeys.records }),
    queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions }),
    queryClient.invalidateQueries({ queryKey: ['health'] }),
    queryClient.invalidateQueries({ queryKey: ['presentation'] }),
    queryClient.invalidateQueries({ queryKey: ['athlete-snapshot'] }),
    queryClient.invalidateQueries({ queryKey: ['today'] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.athleteSnapshot(trainingDayId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.presentationToday(trainingDayId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.today(trainingDayId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dailyBriefing(trainingDayId) }),
  ];

  if (includeBodyComposition) {
    tasks.push(queryClient.invalidateQueries({ queryKey: queryKeys.bodyComposition() }));
  }

  await Promise.all(tasks);
}
