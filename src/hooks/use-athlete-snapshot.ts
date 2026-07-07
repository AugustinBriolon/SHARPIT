'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCallback } from 'react';
import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import { snapshotHasDisplayableContent } from '@/core/athlete-state/snapshot';
import { fetchAthleteSnapshot, refreshAthleteSnapshot } from '@/lib/query/athlete-snapshot-fetch';
import { queryKeys } from '@/lib/query/keys';

export interface UseAthleteSnapshotResult {
  snapshot: AthleteSnapshot | null;
  /** True only when no snapshot exists in cache yet (first visit). */
  loading: boolean;
  isPending: boolean;
  isFetching: boolean;
  isRefreshing: boolean;
  hasContent: boolean;
  error: string | null;
  refresh: () => Promise<AthleteSnapshot>;
}

export function useAthleteSnapshot(date: Date = new Date()): UseAthleteSnapshotResult {
  const trainingDayId = format(date, 'yyyy-MM-dd');
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.athleteSnapshot(trainingDayId),
    queryFn: () => fetchAthleteSnapshot(trainingDayId),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    refetchInterval: (query) => {
      const snap = query.state.data?.snapshot;
      const rec = snap?.freshness.domains.find((d) => d.domain === 'recommendations');
      if (
        rec &&
        (rec.freshness === 'stale' ||
          rec.freshness === 'awaiting_data' ||
          rec.freshness === 'computing')
      ) {
        return 12_000;
      }
      return false;
    },
  });

  const snapshot = query.data?.snapshot ?? null;
  const hasContent = snapshot != null && snapshotHasDisplayableContent(snapshot);

  const refresh = useCallback(async () => {
    const result = await refreshAthleteSnapshot(trainingDayId);
    queryClient.setQueryData(queryKeys.athleteSnapshot(trainingDayId), result);
    return result.snapshot;
  }, [queryClient, trainingDayId]);

  return {
    snapshot,
    loading: query.isPending && snapshot == null,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isRefreshing: query.isFetching && snapshot != null,
    hasContent,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
  };
}
