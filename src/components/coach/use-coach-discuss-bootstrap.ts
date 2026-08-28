'use client';

import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildDiscussContext,
  buildDiscussIntentKey,
  getDiscussBootstrapKey,
  isDiscussBootstrapPending,
  isDiscussDataReady,
} from '@/components/coach/coach-view-discuss';
import { useCreateConversation } from '@/hooks/use-coach';
import { useActivities, useGoals, usePlannedSessions, useRecords } from '@/hooks/use-data';
import { usePhysicalNotes } from '@/hooks/use-physical';
import { useTodayPresentationViewModel } from '@/hooks/use-presentation-view-model';
import { useProjectedAthleteViewModel } from '@/hooks/use-projected-athlete-view-model';
import type { CoachDiscussContext } from '@/lib/coach/chat/coach-discuss-context';

const inFlightDiscussBootstraps = new Set<string>();

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
  setActiveId: (id: string) => void,
) {
  const router = useRouter();
  const createConversation = useCreateConversation();
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
    const { hasDiscussIntent: _hasDiscussIntent, ...discussParams } = params;
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

  function bootstrapDiscussConversation(bootstrapKey: string) {
    if (!discussIntentKey) {
      return;
    }
    if (inFlightDiscussBootstraps.has(bootstrapKey)) {
      return;
    }
    if (bootstrappedDiscussIntentKey.current === discussIntentKey) {
      return;
    }
    inFlightDiscussBootstraps.add(bootstrapKey);

    createConversation
      .mutateAsync({ bootstrapKey })
      .then((c) => {
        bootstrappedDiscussIntentKey.current = discussIntentKey;
        setActiveId(c.id);
        router.replace('/coach', { scroll: false });
      })
      .catch(() => {
        bootstrappedDiscussIntentKey.current = null;
      })
      .finally(() => {
        inFlightDiscussBootstraps.delete(bootstrapKey);
      });
  }

  useEffect(() => {
    if (!discussIntentKey) {
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
    if (pending) {
      return;
    }
    const bootstrapKey = getDiscussBootstrapKey(discussSources);
    if (bootstrapKey) {
      bootstrapDiscussConversation(bootstrapKey);
    }
  }, [
    discussIntentKey,
    discussSources,
    todayQuery.isPending,
    goalsQuery.isPending,
    physicalNotesQuery.isPending,
    recordsQuery.isPending,
    projectionQuery.isPending,
    plannedQuery.isPending,
    activitiesQuery.isPending,
    createConversation,
  ]);

  if (discussDataReady && discussContext && discussIntentKey) {
    latchedDiscussIntentKey.current = discussIntentKey;
    latchedContextRef.current = discussContext;
  }

  return {
    latchedContext: latchedContextRef.current,
    detachLatchedContext,
    createConversation,
  };
}
