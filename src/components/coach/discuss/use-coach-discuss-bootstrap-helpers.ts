'use client';

import { format } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {
  buildDiscussContext,
  buildDiscussIntentKey,
  isDiscussBootstrapPending,
  isDiscussDataReady,
} from '@/components/coach/discuss/coach-view-discuss';
import { useActivities, useGoals, usePlannedSessions, useRecords } from '@/hooks/use-data';
import { usePhysicalNotes } from '@/hooks/use-physical';
import { useTodayPresentationViewModel } from '@/hooks/use-presentation-view-model';
import { useProjectedAthleteViewModel } from '@/hooks/use-projected-athlete-view-model';
import type { CoachDiscussContext } from '@/lib/coach/chat/discuss/coach-discuss-context';
import type { ProjectionHorizonDays } from '@/core/projection/types';

export type CoachDiscussParams = {
  discussId: string | null;
  discussActivityId: string | null;
  discussPlanningHorizon: ProjectionHorizonDays | null;
  discussToday: boolean;
  discussJournalAnalyses: boolean;
  discussGoalId: string | null;
  discussRecordKey: string | null;
  discussConditionId: string | null;
  hasDiscussIntent: boolean;
};

export function useDiscussBootstrapQueries(
  discussPlanningHorizon: CoachDiscussParams['discussPlanningHorizon'],
) {
  const plannedQuery = usePlannedSessions();
  const activitiesQuery = useActivities();
  const projectionQuery = useProjectedAthleteViewModel(discussPlanningHorizon ?? 7);
  const goalsQuery = useGoals();
  const physicalNotesQuery = usePhysicalNotes();
  const todayQuery = useTodayPresentationViewModel(format(new Date(), 'yyyy-MM-dd'));
  const recordsQuery = useRecords();
  return {
    plannedQuery,
    activitiesQuery,
    projectionQuery,
    goalsQuery,
    physicalNotesQuery,
    todayQuery,
    recordsQuery,
  };
}

export function buildDiscussSourceBundle(
  params: CoachDiscussParams,
  queries: ReturnType<typeof useDiscussBootstrapQueries>,
) {
  const { hasDiscussIntent, ...discussParams } = params;
  void hasDiscussIntent;
  return {
    ...discussParams,
    goals: queries.goalsQuery.data ?? [],
    physicalNotes: queries.physicalNotesQuery.data ?? [],
    records: queries.recordsQuery.data,
    projectionVisible: queries.projectionQuery.data?.visible === true,
    plannedSessions: queries.plannedQuery.data ?? [],
    activities: queries.activitiesQuery.data ?? [],
    todayLoaded: queries.todayQuery.data !== null,
  };
}

export function useDiscussContextLatch() {
  const latchedContextRef = useRef<CoachDiscussContext | null>(null);
  const [contextLatchEpoch, setContextLatchEpoch] = useState(0);
  const latchedDiscussIntentKeyRef = useRef<string | null>(null);
  const bootstrappedDiscussIntentKeyRef = useRef<string | null>(null);

  function detachLatchedContext() {
    if (latchedContextRef.current === null && latchedDiscussIntentKeyRef.current === null) {
      return;
    }
    latchedContextRef.current = null;
    latchedDiscussIntentKeyRef.current = null;
    bootstrappedDiscussIntentKeyRef.current = null;
    setContextLatchEpoch((n) => n + 1);
  }

  function attachLatchedContext(context: CoachDiscussContext) {
    latchedContextRef.current = context;
    latchedDiscussIntentKeyRef.current = `manual:${context.kind}:${context.sourceHref}:${context.label}`;
    setContextLatchEpoch((n) => n + 1);
  }

  return {
    latchedContextRef,
    latchedDiscussIntentKeyRef,
    bootstrappedDiscussIntentKeyRef,
    contextLatchEpoch,
    detachLatchedContext,
    attachLatchedContext,
  };
}

type DiscussBootstrapSyncArgs = {
  params: CoachDiscussParams;
  discussIntentKey: string | null;
  discussContext: CoachDiscussContext | null;
  discussSources: ReturnType<typeof buildDiscussSourceBundle>;
  queries: ReturnType<typeof useDiscussBootstrapQueries>;
  latch: ReturnType<typeof useDiscussContextLatch>;
  onDiscussReady: (context: CoachDiscussContext) => void;
  router: AppRouterInstance;
};

function buildDiscussPendingFlags(
  discussSources: DiscussBootstrapSyncArgs['discussSources'],
  queries: DiscussBootstrapSyncArgs['queries'],
) {
  return {
    ...discussSources,
    todayPending: queries.todayQuery.isPending,
    goalsPending: queries.goalsQuery.isPending,
    physicalNotesPending: queries.physicalNotesQuery.isPending,
    recordsPending: queries.recordsQuery.isPending,
    projectionPending: queries.projectionQuery.isPending,
    plannedPending: queries.plannedQuery.isPending,
    activitiesPending: queries.activitiesQuery.isPending,
  };
}

type ApplyDiscussBootstrapInput = {
  discussIntentKey: string;
  discussContext: CoachDiscussContext;
  latch: DiscussBootstrapSyncArgs['latch'];
  onDiscussReady: (context: CoachDiscussContext) => void;
  router: AppRouterInstance;
};

function applyDiscussBootstrap(input: ApplyDiscussBootstrapInput) {
  input.latch.latchedDiscussIntentKeyRef.current = input.discussIntentKey;
  input.latch.latchedContextRef.current = input.discussContext;
  input.latch.bootstrappedDiscussIntentKeyRef.current = input.discussIntentKey;
  input.onDiscussReady(input.discussContext);
  input.router.replace('/coach', { scroll: false });
}

export function useDiscussBootstrapSync({
  params,
  discussIntentKey,
  discussContext,
  discussSources,
  queries,
  latch,
  onDiscussReady,
  router,
}: DiscussBootstrapSyncArgs) {
  useEffect(() => {
    if (!discussIntentKey || !params.hasDiscussIntent) {
      return;
    }
    if (latch.bootstrappedDiscussIntentKeyRef.current === discussIntentKey) {
      return;
    }
    if (
      isDiscussBootstrapPending(buildDiscussPendingFlags(discussSources, queries)) ||
      !discussContext
    ) {
      return;
    }
    applyDiscussBootstrap({
      discussIntentKey,
      discussContext,
      latch,
      onDiscussReady,
      router,
    });
  }, [
    discussIntentKey,
    discussContext,
    discussSources,
    onDiscussReady,
    params.hasDiscussIntent,
    router,
    queries,
    latch,
  ]);
}

type DiscussDataReadyInput = {
  params: CoachDiscussParams;
  discussIntentKey: string | null;
  contextLatchEpoch: number;
  discussSources: ReturnType<typeof buildDiscussSourceBundle>;
  latchedDiscussIntentKeyRef: ReturnType<
    typeof useDiscussContextLatch
  >['latchedDiscussIntentKeyRef'];
};

export function useDiscussDataReadyFlag(input: DiscussDataReadyInput) {
  return useMemo(() => {
    if (!input.params.hasDiscussIntent || !input.discussIntentKey) {
      return false;
    }
    if (input.latchedDiscussIntentKeyRef.current === input.discussIntentKey) {
      return false;
    }
    return isDiscussDataReady(input.discussSources);
  }, [
    input.params.hasDiscussIntent,
    input.discussIntentKey,
    input.contextLatchEpoch,
    input.discussSources,
    input.latchedDiscussIntentKeyRef,
  ]);
}

export function latchDiscussContextWhenReady(
  discussDataReady: boolean,
  discussContext: CoachDiscussContext | null,
  discussIntentKey: string | null,
  latch: Pick<
    ReturnType<typeof useDiscussContextLatch>,
    'latchedDiscussIntentKeyRef' | 'latchedContextRef'
  >,
) {
  if (discussDataReady && discussContext && discussIntentKey) {
    latch.latchedDiscussIntentKeyRef.current = discussIntentKey;
    latch.latchedContextRef.current = discussContext;
  }
}

export { buildDiscussContext, buildDiscussIntentKey };
