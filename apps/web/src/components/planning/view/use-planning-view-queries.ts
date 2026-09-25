'use client';

import { EMPTY_GOALS } from '@/components/planning/session/session-defaults';
import { useActivities, useGoals, usePlannedSessions, useTrainingPlan } from '@/hooks/use-data';
import { isAnyInitialQueryLoad, isInitialQueryLoad } from '@/hooks/use-query-status';
import { useMemo } from 'react';

export function usePlanningViewQueries() {
  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();
  const planQuery = useTrainingPlan();

  const activities = activitiesQuery.data ?? [];
  const planned = plannedQuery.data ?? [];
  const goals = goalsQuery.data ?? EMPTY_GOALS;
  const goalTitleById = useMemo(() => new Map(goals.map((g) => [g.id, g.title] as const)), [goals]);
  const isLoading = isAnyInitialQueryLoad([activitiesQuery, plannedQuery]);
  const goalsLoading = isInitialQueryLoad(goalsQuery);

  return {
    activities,
    activitiesQuery,
    goalTitleById,
    goals,
    goalsLoading,
    isLoading,
    planQuery,
    planned,
    plannedQuery,
  };
}
