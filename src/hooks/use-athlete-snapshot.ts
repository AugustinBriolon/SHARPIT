'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { isSet } from '@/lib/util/value';
import { format } from 'date-fns';
import { useCallback } from 'react';
import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import { snapshotHasDisplayableContent } from '@/core/athlete-state/snapshot';
import { shouldRefreshSnapshotForPhaseDrift } from '@/lib/athlete-state/snapshot-phase';
import { fetchAthleteSnapshot, refreshAthleteSnapshot } from '@/lib/query/athlete-snapshot-fetch';
import { queryKeys } from '@/lib/query/keys';

const RECOMMENDATION_REFRESH_INTERVAL_MS = 12_000;
const PHASE_DRIFT_REFRESH_INTERVAL_MS = 60_000;

function snapshotRefetchIntervalMs(snapshot: AthleteSnapshot | undefined): number | false {
  const rec = snapshot?.freshness.domains.find((d) => d.domain === 'recommendations');
  if (
    rec &&
    (rec.freshness === 'stale' ||
      rec.freshness === 'awaiting_data' ||
      rec.freshness === 'computing')
  ) {
    return RECOMMENDATION_REFRESH_INTERVAL_MS;
  }
  if (snapshot && shouldRefreshSnapshotForPhaseDrift(snapshot)) {
    return PHASE_DRIFT_REFRESH_INTERVAL_MS;
  }
  return false;
}

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

function snapshotHookLoading(
  isPending: boolean,
  snapshot: AthleteSnapshot | null | undefined,
): boolean {
  return isPending && !isSet(snapshot);
}

export function useAthleteSnapshot(date: Date = new Date()): UseAthleteSnapshotResult {
  const trainingDayId = format(date, 'yyyy-MM-dd');
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.athleteSnapshot(trainingDayId),
    queryFn: () => fetchAthleteSnapshot(trainingDayId),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    refetchInterval: (query) => snapshotRefetchIntervalMs(query.state.data?.snapshot),
  });

  const snapshot = query.data?.snapshot ?? null;
  const hasContent = isSet(snapshot) && snapshotHasDisplayableContent(snapshot);

  const refresh = useCallback(async () => {
    const result = await refreshAthleteSnapshot(trainingDayId);
    queryClient.setQueryData(queryKeys.athleteSnapshot(trainingDayId), result);
    return result.snapshot;
  }, [queryClient, trainingDayId]);

  return {
    snapshot,
    loading: snapshotHookLoading(query.isPending, snapshot),
    isPending: query.isPending,
    isFetching: query.isFetching,
    isRefreshing: query.isFetching && isSet(snapshot),
    hasContent,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
  };
}
