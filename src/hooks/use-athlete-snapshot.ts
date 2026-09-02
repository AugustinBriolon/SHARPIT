'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { isSet } from '@/lib/util/value';
import { format } from 'date-fns';
import { useCallback, useSyncExternalStore } from 'react';
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

function toTrainingDayId(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function subscribeTrainingDay(): () => void {
  return () => undefined;
}

function readClientTrainingDayId(): string {
  return toTrainingDayId(new Date());
}

/**
 * Calendar day for "today" queries.
 * Server/prerender snapshot is `null` (no impure `new Date()`).
 * Client snapshot resolves after hydration — same Cache Components contract as
 * Today Suspense shells (`docs/INSTANT_UX_ARCHITECTURE.md`).
 */
function useResolvedTrainingDayId(explicitDate?: Date): string | null {
  const clientToday = useSyncExternalStore(
    subscribeTrainingDay,
    readClientTrainingDayId,
    () => null,
  );
  if (explicitDate) {
    return toTrainingDayId(explicitDate);
  }
  return clientToday;
}

function toSnapshotResult(
  dayReady: boolean,
  query: {
    data?: { snapshot?: AthleteSnapshot } | null;
    error: Error | null;
    isFetching: boolean;
    isPending: boolean;
  },
  refresh: () => Promise<AthleteSnapshot>,
): UseAthleteSnapshotResult {
  const snapshot = query.data?.snapshot ?? null;
  const waiting = !dayReady || query.isPending;
  return {
    snapshot,
    loading: snapshotHookLoading(waiting, snapshot),
    isPending: waiting,
    isFetching: query.isFetching,
    isRefreshing: query.isFetching && isSet(snapshot),
    hasContent: isSet(snapshot) && snapshotHasDisplayableContent(snapshot),
    error: query.error?.message ?? null,
    refresh,
  };
}

/**
 * Athlete snapshot for a training day.
 *
 * Omit `date` for "today" — resolved client-side only (prerender-safe).
 * Pass a stable `Date` (e.g. from a route param), never `new Date()` at the
 * call site during render.
 */
export function useAthleteSnapshot(date?: Date): UseAthleteSnapshotResult {
  const trainingDayId = useResolvedTrainingDayId(date);
  const queryClient = useQueryClient();
  const dayReady = Boolean(trainingDayId);

  const query = useQuery({
    queryKey: queryKeys.athleteSnapshot(trainingDayId ?? 'pending'),
    queryFn: () => fetchAthleteSnapshot(trainingDayId!),
    enabled: dayReady,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    refetchInterval: (q) => snapshotRefetchIntervalMs(q.state.data?.snapshot),
  });

  const refresh = useCallback(async () => {
    if (!trainingDayId) {
      throw new Error('Jour d’entraînement indisponible.');
    }
    const result = await refreshAthleteSnapshot(trainingDayId);
    queryClient.setQueryData(queryKeys.athleteSnapshot(trainingDayId), result);
    return result.snapshot;
  }, [queryClient, trainingDayId]);

  return toSnapshotResult(
    dayReady,
    {
      data: query.data,
      error: query.error instanceof Error ? query.error : null,
      isFetching: query.isFetching,
      isPending: query.isPending,
    },
    refresh,
  );
}
