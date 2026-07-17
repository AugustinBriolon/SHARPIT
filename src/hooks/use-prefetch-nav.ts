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

export function usePrefetchNavQuery() {
  const queryClient = useQueryClient();
  const trainingDayId = format(new Date(), 'yyyy-MM-dd');

  return useCallback(
    (href: string) => {
      const pre = <T>(key: readonly unknown[], fn: () => Promise<T>) => {
        void queryClient.prefetchQuery({ queryKey: key, queryFn: fn, staleTime: PREFETCH_STALE });
      };

      switch (href) {
        case '/':
          pre(queryKeys.presentationToday(trainingDayId), () =>
            fetchTodayPresentation(trainingDayId),
          );
          break;
        case '/seances':
          pre(queryKeys.plannedSessions, fetchPlannedSessions);
          pre(queryKeys.activities, fetchActivities);
          break;
        case '/corps':
          pre(['presentation', 'recovery', trainingDayId], () =>
            fetchRecoveryPresentation(trainingDayId),
          );
          pre(['presentation', 'body', 'all'], () => fetchBodyPresentation(null));
          pre(['presentation', 'physical-health', trainingDayId], () =>
            fetchPhysicalHealthPresentation(trainingDayId),
          );
          pre(queryKeys.physicalNotes, fetchPhysicalNotes);
          break;
        case '/goals':
          pre(queryKeys.goals, fetchGoals);
          break;
        case '/coach':
          pre(queryKeys.plannedSessions, fetchPlannedSessions);
          pre(queryKeys.activities, fetchActivities);
          pre(queryKeys.conversations, fetchConversations);
          break;
        case '/calendar':
          pre(queryKeys.plannedSessions, fetchPlannedSessions);
          pre(queryKeys.goals, fetchGoals);
          break;
        case '/planning':
          pre(queryKeys.plannedSessions, fetchPlannedSessions);
          pre(queryKeys.goals, fetchGoals);
          break;
        case '/recovery':
          pre(['presentation', 'recovery', trainingDayId], () =>
            fetchRecoveryPresentation(trainingDayId),
          );
          break;
        case '/today/sleep':
          pre(['presentation', 'sleep', trainingDayId], () =>
            fetchSleepPresentation(trainingDayId),
          );
          break;
        case '/today/effort':
          pre(['presentation', 'effort', trainingDayId], () =>
            fetchEffortPresentation(trainingDayId),
          );
          break;
        case '/today/adaptation':
          pre(['presentation', 'adaptation', trainingDayId], () =>
            fetchAdaptationPresentation(trainingDayId),
          );
          break;
        case '/training':
          pre(queryKeys.activities, fetchActivities);
          break;
      }
    },
    [queryClient, trainingDayId],
  );
}
