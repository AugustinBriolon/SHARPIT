'use client';

import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCallback } from 'react';
import {
  fetchActivities,
  fetchActivityStream,
  fetchAthleteProfile,
  fetchConversations,
  fetchGoals,
  fetchPhysicalNotes,
  fetchPlannedSessions,
  fetchTrainingPlan,
} from '@/lib/query/fetchers';
import { selectPlanHubStreamPrefetchIds } from '@/lib/plan/week/plan-week-previews';
import type { ClientActivity } from '@/lib/query/types';
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

function prefetchNavRoute(
  href: string,
  pre: PrefetchFn,
  trainingDayId: string,
  queryClient: QueryClient,
): void {
  const routes: Record<string, () => void> = {
    '/': () =>
      pre(queryKeys.presentationToday(trainingDayId), () => fetchTodayPresentation(trainingDayId)),
    '/plan': () => prefetchPlanHub(queryClient, pre),
    '/plan/semaine': () => prefetchPlanHub(queryClient, pre),
    '/activite': () => {
      pre(queryKeys.activities, fetchActivities);
    },
    '/moi': () => {
      pre(queryKeys.goals, fetchGoals);
      prefetchProgressHub(pre, trainingDayId);
    },
    '/moi/corps': () => {
      pre(queryKeys.athleteProfile, fetchAthleteProfile);
      prefetchProgressHub(pre, trainingDayId);
    },
    '/moi/objectifs': () => {
      pre(queryKeys.goals, fetchGoals);
    },
    '/moi/performance': () => {
      pre(queryKeys.goals, fetchGoals);
      prefetchProgressHub(pre, trainingDayId);
    },
    '/coach': () => {
      pre(queryKeys.plannedSessions, fetchPlannedSessions);
      pre(queryKeys.activities, fetchActivities);
      pre(queryKeys.conversations, fetchConversations);
    },
    '/today/recovery': () =>
      pre(queryKeys.presentationRecovery(trainingDayId), () =>
        fetchRecoveryPresentation(trainingDayId),
      ),
    '/today/sleep': () =>
      pre(queryKeys.presentationSleep(trainingDayId), () => fetchSleepPresentation(trainingDayId)),
    '/plan/charge': () =>
      pre(queryKeys.presentationEffort(trainingDayId), () =>
        fetchEffortPresentation(trainingDayId),
      ),
    '/plan/adaptation': () =>
      pre(queryKeys.presentationAdaptation(trainingDayId), () =>
        fetchAdaptationPresentation(trainingDayId),
      ),
  };
  routes[href]?.();
}

function prefetchPlanHub(queryClient: QueryClient, pre: PrefetchFn) {
  pre(queryKeys.plannedSessions, fetchPlannedSessions);
  pre(queryKeys.goals, fetchGoals);
  pre(queryKeys.trainingPlan, fetchTrainingPlan);
  void queryClient
    .prefetchQuery({
      queryKey: queryKeys.activities,
      queryFn: fetchActivities,
      staleTime: PREFETCH_STALE,
    })
    .then(() => {
      const activities = queryClient.getQueryData<ClientActivity[]>(queryKeys.activities) ?? [];
      for (const activityId of selectPlanHubStreamPrefetchIds(activities)) {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.activityStream(activityId),
          queryFn: () => fetchActivityStream(activityId),
          staleTime: Infinity,
        });
      }
    });
}

function prefetchProgressHub(pre: PrefetchFn, trainingDayId: string) {
  pre(queryKeys.presentationRecovery(trainingDayId), () =>
    fetchRecoveryPresentation(trainingDayId),
  );
  pre(queryKeys.presentationBody, () => fetchBodyPresentation(null));
  pre(queryKeys.presentationPhysicalHealth(trainingDayId), () =>
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

      prefetchNavRoute(href, pre, trainingDayId, queryClient);
    },
    [queryClient],
  );
}
