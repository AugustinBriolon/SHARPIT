'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useConversation, useConversations } from '@/hooks/use-coach';
import { useOfflineSnapshot } from '@/hooks/use-offline-snapshot';
import { useOnlineStatus } from '@/hooks/use-online-status';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import { createClientId } from '@/lib/client-id';

function createEphemeralId(): string {
  return createClientId();
}

function getInitialDraftId(
  hasDiscuss: boolean,
  cache: { current: string | null | undefined },
): string | null {
  if (cache.current !== undefined) {
    return cache.current;
  }
  cache.current = hasDiscuss ? null : createEphemeralId();
  return cache.current;
}

export function parseDiscussPlanningHorizon(raw: string | null): ProjectionHorizonDays | null {
  const value = Number(raw);
  if ([1, 3, 7, 14].includes(value)) {
    return value as ProjectionHorizonDays;
  }
  return null;
}

export function useCoachDiscussParams() {
  const searchParams = useSearchParams();
  const discussId = searchParams.get('discuss');
  const discussActivityId = searchParams.get('discussActivity');
  const discussPlanningHorizon = parseDiscussPlanningHorizon(searchParams.get('discussPlanning'));
  const discussToday = searchParams.get('discussToday') === '1';
  const discussGoalId = searchParams.get('discussGoal');
  const discussRecordKey = searchParams.get('discussRecord');
  const discussConditionId = searchParams.get('discussCondition');
  const hasDiscussIntent = Boolean(
    discussId ||
    discussActivityId ||
    discussPlanningHorizon ||
    discussToday ||
    discussGoalId ||
    discussConditionId ||
    discussRecordKey,
  );
  return {
    discussId,
    discussActivityId,
    discussPlanningHorizon,
    discussToday,
    discussGoalId,
    discussRecordKey,
    discussConditionId,
    hasDiscussIntent,
  };
}

export function useCoachConversationSelection(hasDiscussIntent: boolean, online: boolean) {
  const initialDraftIdRef = useRef<string | null | undefined>(undefined);
  const [activeId, setActiveId] = useState<string | null>(() =>
    getInitialDraftId(hasDiscussIntent, initialDraftIdRef),
  );
  const [ephemeralIds, setEphemeralIds] = useState<Set<string>>(() => {
    const id = getInitialDraftId(hasDiscussIntent, initialDraftIdRef);
    return id ? new Set([id]) : new Set();
  });
  const [autoReplyId, setAutoReplyId] = useState<string | null>(null);

  const conversationsQuery = useConversations();
  const selectedId = activeId;
  const isEphemeral = selectedId !== null && ephemeralIds.has(selectedId);
  const activeConversation = useConversation(isEphemeral ? null : selectedId);
  const activeHasMessages =
    !isEphemeral &&
    Array.isArray(activeConversation.data?.messages) &&
    activeConversation.data.messages.length > 0;
  const hasNoLiveContent = conversationsQuery.data === null && !activeHasMessages;
  const { entry: offlineEntry } = useOfflineSnapshot(!online && hasNoLiveContent);

  useEffect(() => {
    if (!selectedId || isEphemeral) {
      return;
    }
    if (activeConversation.isPending || activeConversation.isLoading) {
      return;
    }
    if (activeConversation.data) {
      return;
    }
    const id = createEphemeralId();
    setEphemeralIds((prev) => new Set(prev).add(id));
    setActiveId(id);
  }, [
    selectedId,
    isEphemeral,
    activeConversation.isPending,
    activeConversation.isLoading,
    activeConversation.data,
  ]);

  function openNewConversation(detachLatchedContext: () => void) {
    const id = createEphemeralId();
    setEphemeralIds((prev) => new Set(prev).add(id));
    setActiveId(id);
    detachLatchedContext();
    return id;
  }

  function handleConversationCreated(id: string) {
    if (!selectedId) {
      return;
    }
    setEphemeralIds((prev) => {
      const next = new Set(prev);
      next.delete(selectedId);
      return next;
    });
    setActiveId(id);
    setAutoReplyId(id);
  }

  return {
    conversationsQuery,
    selectedId,
    isEphemeral,
    activeConversation,
    hasNoLiveContent,
    offlineEntry,
    autoReplyId,
    setAutoReplyId,
    setActiveId,
    setEphemeralIds,
    openNewConversation,
    handleConversationCreated,
  };
}
