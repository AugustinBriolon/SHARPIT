'use client';

import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildDiscussContext,
  buildDiscussIntentKey,
  isDiscussBootstrapPending,
  isDiscussDataReady,
} from '@/components/coach/coach-view-discuss';
import { useActivities, useGoals, usePlannedSessions, useRecords } from '@/hooks/use-data';
import { usePhysicalNotes } from '@/hooks/use-physical';
import { useTodayPresentationViewModel } from '@/hooks/use-presentation-view-model';
import { useProjectedAthleteViewModel } from '@/hooks/use-projected-athlete-view-model';
import type { CoachDiscussContext } from '@/lib/coach/chat/coach-discuss-context';

export type CoachDiscussParams = {
  discussId: string | null;
  discussActivityId: string | null;
  discussPlanningHorizon: import('@/core/projection/types').ProjectionHorizonDays | null;
  discussToday: boolean;
  discussGoalId: string | null;
  discussRecordKey: string | null;
  discussConditionId: string | null;
  hasDiscussIntent: boolean;
};

export function useCoachDiscussBootstrap(
  params: CoachDiscussParams,
  onDiscussReady: (context: CoachDiscussContext) => void,
) {
  const router = useRouter();
  const latchedContextRef = useRef<CoachDiscussContext | null>(null);
  const [contextLatchEpoch, setContextLatchEpoch] = useState(0);
  const latchedDiscussIntentKey = useRef<string | null>(null);
  const bootstrappedDiscussIntentKey = useRef<string | null>(null);

  const plannedQuery = usePlannedSessions();
  const activitiesQuery = useActivities();
  const projectionQuery = useProjectedAthleteViewModel(params.discussPlanningHorizon ?? 7);
  const goalsQuery = useGoals();
  const physicalNotesQuery = usePhysicalNotes();
  const todayQuery = useTodayPresentationViewModel(format(new Date(), 'yyyy-MM-dd'));
  const recordsQuery = useRecords();

  const discussIntentKey = useMemo(() => buildDiscussIntentKey(params), [params]);

  const discussSources = useMemo(() => {
    const { hasDiscussIntent, ...discussParams } = params;
    void hasDiscussIntent;
    return {
      ...discussParams,
      goals: goalsQuery.data ?? [],
      physicalNotes: physicalNotesQuery.data ?? [],
      records: recordsQuery.data,
      projectionVisible: projectionQuery.data?.visible === true,
      plannedSessions: plannedQuery.data ?? [],
      activities: activitiesQuery.data ?? [],
      todayLoaded: todayQuery.data !== null,
    };
  }, [
    params,
    goalsQuery.data,
    physicalNotesQuery.data,
    recordsQuery.data,
    projectionQuery.data,
    plannedQuery.data,
    activitiesQuery.data,
    todayQuery.data,
  ]);

  const discussDataReady = useMemo(() => {
    if (!params.hasDiscussIntent || !discussIntentKey) {
      return false;
    }
    if (latchedDiscussIntentKey.current === discussIntentKey) {
      return false;
    }
    return isDiscussDataReady(discussSources);
  }, [params.hasDiscussIntent, discussIntentKey, contextLatchEpoch, discussSources]);

  const discussContext = useMemo(() => buildDiscussContext(discussSources), [discussSources]);

  function detachLatchedContext() {
    if (latchedContextRef.current === null && latchedDiscussIntentKey.current === null) {
      return;
    }
    latchedContextRef.current = null;
    latchedDiscussIntentKey.current = null;
    bootstrappedDiscussIntentKey.current = null;
    setContextLatchEpoch((n) => n + 1);
  }

  useEffect(() => {
    if (!discussIntentKey || !params.hasDiscussIntent) {
      return;
    }
    if (bootstrappedDiscussIntentKey.current === discussIntentKey) {
      return;
    }
    const pending = isDiscussBootstrapPending({
      ...discussSources,
      todayPending: todayQuery.isPending,
      goalsPending: goalsQuery.isPending,
      physicalNotesPending: physicalNotesQuery.isPending,
      recordsPending: recordsQuery.isPending,
      projectionPending: projectionQuery.isPending,
      plannedPending: plannedQuery.isPending,
      activitiesPending: activitiesQuery.isPending,
    });
    if (pending || !discussContext) {
      return;
    }

    latchedDiscussIntentKey.current = discussIntentKey;
    latchedContextRef.current = discussContext;
    bootstrappedDiscussIntentKey.current = discussIntentKey;
    onDiscussReady(discussContext);
    router.replace('/coach', { scroll: false });
  }, [
    discussIntentKey,
    discussContext,
    discussSources,
    onDiscussReady,
    params.hasDiscussIntent,
    router,
    todayQuery.isPending,
    goalsQuery.isPending,
    physicalNotesQuery.isPending,
    recordsQuery.isPending,
    projectionQuery.isPending,
    plannedQuery.isPending,
    activitiesQuery.isPending,
  ]);

  if (discussDataReady && discussContext && discussIntentKey) {
    latchedDiscussIntentKey.current = discussIntentKey;
    latchedContextRef.current = discussContext;
  }

  return {
    latchedContext: latchedContextRef.current,
    detachLatchedContext,
  };
}
