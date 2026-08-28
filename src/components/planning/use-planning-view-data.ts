'use client';

import { useActivities, useGoals, usePlannedSessions, useTrainingPlan } from '@/hooks/use-data';
import { isAnyInitialQueryLoad } from '@/hooks/use-query-status';
import { buildPlanningWeeks, resolvePlanningWeek } from '@/lib/planned-session/planning';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import type { ClientPlannedSession } from '@/lib/query/types';
import { endOfWeek, startOfWeek } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EMPTY_GOALS } from '@/components/planning/session/session-defaults';
import { usePlanningDeepLinkSync } from '@/components/planning/use-planning-deep-link-sync';
import { usePlanningIntelligence } from '@/components/planning/use-planning-intelligence';
import {
  buildPlanningDays,
  findNextRace,
  resolvePlanWeekForStart,
} from '@/components/planning/use-planning-view-helpers';

const WEEK_OPTS = { weekStartsOn: 1 as const };

export type PlanningDialogState =
  { mode: 'create'; date: Date } | { mode: 'edit'; session: ClientPlannedSession } | null;

function parseCalendarDateParam(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function usePlanningViewData(showCoachMenu: boolean) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const plannedIdFromUrl = searchParams.get('planned');
  const createFromUrl = showCoachMenu && searchParams.has('create');

  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();
  const planQuery = useTrainingPlan();

  const weekFromUrl = parseCalendarDateParam(searchParams.get('week'));
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(weekFromUrl ?? new Date(), WEEK_OPTS),
  );

  const activities = activitiesQuery.data ?? [];
  const planned = plannedQuery.data ?? [];
  const goals = goalsQuery.data ?? EMPTY_GOALS;
  const goalTitleById = useMemo(() => new Map(goals.map((g) => [g.id, g.title] as const)), [goals]);

  const nextRace = useMemo(() => findNextRace(goals), [goals]);
  const builtWeeks = useMemo(
    () => buildPlanningWeeks(activities, planned, nextRace?.target ?? null),
    [activities, planned, nextRace?.target],
  );
  const week = useMemo(
    () => resolvePlanningWeek(weekStart, activities, planned, nextRace?.target ?? null, builtWeeks),
    [weekStart, activities, planned, nextRace?.target, builtWeeks],
  );

  const planWeek = useMemo(
    () => resolvePlanWeekForStart(planQuery.data, week.start),
    [planQuery.data, week.start],
  );

  const days = useMemo(() => buildPlanningDays(week), [week]);
  const isLoading = isAnyInitialQueryLoad([activitiesQuery, plannedQuery, goalsQuery]);
  const intelligence = usePlanningIntelligence(week.index, week.start, isLoading);

  const { deepLinkSession, closePlannedDialogUrlParams } = usePlanningDeepLinkSync({
    showCoachMenu,
    planned,
    plannedQueryPending: plannedQuery.isPending,
    plannedIdFromUrl,
    setWeekStart,
  });

  function openPlannedSession(session: ClientPlannedSession) {
    prefetchPlannedSessionDetail(queryClient, session.id);
  }

  return {
    anchorTrainingDayId: intelligence.anchorTrainingDayId,
    completed: week.planned.filter((p) => p.completed).length,
    createFromUrl,
    days,
    deepLinkSession,
    goalTitleById,
    goals,
    hasActionableAlternative: intelligence.hasActionableAlternative,
    isCurrentWeek: week.index === 0,
    isLoading,
    nextRace,
    planWeek,
    projectionQuery: intelligence.projectionQuery,
    scenarioComparisonQuery: intelligence.scenarioComparisonQuery,
    showPlanningIntelligence: intelligence.showPlanningIntelligence,
    total: week.planned.length,
    week,
    weekEnd: endOfWeek(week.start, WEEK_OPTS),
    weekStart,
    closePlannedDialogUrlParams,
    openPlannedSession,
    prefetchPlannedSession: openPlannedSession,
    setWeekStart,
  };
}
