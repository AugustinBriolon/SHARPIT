'use client';

import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCallback } from 'react';
import {
  fetchActivities,
  fetchConversations,
  fetchGoals,
  fetchPhysicalNotes,
  fetchPlannedSessions,
} from '@/lib/query/fetchers';
import {
  fetchAdaptationPresentation,
  fetchBodyPresentation,
  fetchEffortPresentation,
  fetchPhysicalHealthPresentation,
  fetchRecoveryPresentation,
  fetchSleepPresentation,
  fetchTodayPresentation,
} from '@/lib/query/presentation-fetchers';
import { queryKeys } from '@/lib/query/keys';

const PREFETCH_STALE = 5 * 60_000;

type PrefetchFn = <T>(key: readonly unknown[], fn: () => Promise<T>) => void;

function prefetchNavRoute(href: string, pre: PrefetchFn, trainingDayId: string): void {
  const routes: Record<string, () => void> = {
    '/': () =>
      pre(queryKeys.presentationToday(trainingDayId), () => fetchTodayPresentation(trainingDayId)),
    '/plan': () => prefetchTrainingHub(pre),
    '/activite': () => {
      pre(queryKeys.activities, fetchActivities);
    },
    '/moi': () => {
      pre(queryKeys.goals, fetchGoals);
      prefetchProgressHub(pre, trainingDayId);
    },
    '/training': () => prefetchTrainingHub(pre),
    '/progress': () => {
      pre(queryKeys.goals, fetchGoals);
      prefetchProgressHub(pre, trainingDayId);
    },
    '/settings': () => pre(queryKeys.goals, fetchGoals),
    '/settings/account': () => pre(queryKeys.goals, fetchGoals),
    '/coach': () => {
      pre(queryKeys.plannedSessions, fetchPlannedSessions);
      pre(queryKeys.activities, fetchActivities);
      pre(queryKeys.conversations, fetchConversations);
    },
    '/training/planning': () => {
      pre(queryKeys.plannedSessions, fetchPlannedSessions);
      pre(queryKeys.goals, fetchGoals);
    },
    '/today/recovery': () =>
      pre(['presentation', 'recovery', trainingDayId], () =>
        fetchRecoveryPresentation(trainingDayId),
      ),
    '/today/sleep': () =>
      pre(['presentation', 'sleep', trainingDayId], () => fetchSleepPresentation(trainingDayId)),
    '/today/effort': () =>
      pre(['presentation', 'effort', trainingDayId], () => fetchEffortPresentation(trainingDayId)),
    '/today/adaptation': () =>
      pre(['presentation', 'adaptation', trainingDayId], () =>
        fetchAdaptationPresentation(trainingDayId),
      ),
  };
  routes[href]?.();
}

function prefetchTrainingHub(pre: PrefetchFn) {
  pre(queryKeys.plannedSessions, fetchPlannedSessions);
  pre(queryKeys.activities, fetchActivities);
  pre(queryKeys.goals, fetchGoals);
}

function prefetchProgressHub(pre: PrefetchFn, trainingDayId: string) {
  pre(['presentation', 'recovery', trainingDayId], () => fetchRecoveryPresentation(trainingDayId));
  pre(['presentation', 'body', 'all'], () => fetchBodyPresentation(null));
  pre(['presentation', 'physical-health', trainingDayId], () =>
    fetchPhysicalHealthPresentation(trainingDayId),
  );
  pre(queryKeys.physicalNotes, fetchPhysicalNotes);
}

/**
 * Warm TanStack Query cache for primary nav destinations.
 * Hrefs must match Shell V1 hubs (`/`, `/plan`, `/activite`, `/moi`) and deep routes.
 */
export function usePrefetchNavQuery() {
  const queryClient = useQueryClient();

  return useCallback(
    (href: string) => {
      // Resolved per prefetch, not per render: reading the clock while
      // rendering would freeze "today" into the prerendered shell, and a
      // session left open across midnight would keep warming yesterday.
      const trainingDayId = format(new Date(), 'yyyy-MM-dd');

      const pre = <T>(key: readonly unknown[], fn: () => Promise<T>) => {
        void queryClient.prefetchQuery({ queryKey: key, queryFn: fn, staleTime: PREFETCH_STALE });
      };

      prefetchNavRoute(href, pre, trainingDayId);
    },
    [queryClient],
  );
}
