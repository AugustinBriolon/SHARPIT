'use client';

import { usePlanningDeepLinkSync } from '@/components/planning/view/use-planning-deep-link-sync';
import { usePlanningIntelligence } from '@/components/planning/view/use-planning-intelligence';
import { usePlanningViewQueries } from '@/components/planning/view/use-planning-view-queries';
import { usePlanningWeekState } from '@/components/planning/view/use-planning-week-state';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import type { ClientPlannedSession } from '@/lib/query/types';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

export type PlanningDialogState =
  { mode: 'create'; date: Date } | { mode: 'edit'; session: ClientPlannedSession } | null;

function parseCalendarDateParam(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readPlanningUrlState(searchParams: URLSearchParams, showCoachMenu: boolean) {
  const adaptFromUrl = showCoachMenu && searchParams.has('adapt');
  return {
    plannedIdFromUrl: searchParams.get('planned'),
    createFromUrl: showCoachMenu && searchParams.has('create'),
    /** Remplir ma semaine — PlanGenerator (cross-destination deep-link). */
    generateFromUrl: showCoachMenu && searchParams.has('generate'),
    adaptFromUrl,
    adaptFocusFromUrl: adaptFromUrl ? (searchParams.get('focus') ?? undefined) : undefined,
    weekFromUrl: parseCalendarDateParam(searchParams.get('week')),
  };
}

export function usePlanningViewData(showCoachMenu: boolean) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const urlState = readPlanningUrlState(searchParams, showCoachMenu);
  const queries = usePlanningViewQueries();
  const weekState = usePlanningWeekState({
    weekFromUrl: urlState.weekFromUrl,
    activities: queries.activities,
    planned: queries.planned,
    goals: queries.goals,
    plan: queries.planQuery.data,
  });
  const intelligence = usePlanningIntelligence(
    weekState.week.index,
    weekState.week.start,
    queries.isLoading,
  );
  const deepLink = usePlanningDeepLinkSync({
    showCoachMenu,
    planned: queries.planned,
    plannedQueryPending: queries.plannedQuery.isPending,
    plannedIdFromUrl: urlState.plannedIdFromUrl,
    setWeekStart: weekState.setWeekStart,
  });

  function openPlannedSession(session: ClientPlannedSession) {
    prefetchPlannedSessionDetail(queryClient, session.id);
  }

  return {
    ...intelligence,
    ...urlState,
    ...queries,
    ...weekState,
    ...deepLink,
    openPlannedSession,
    prefetchPlannedSession: openPlannedSession,
  };
}
