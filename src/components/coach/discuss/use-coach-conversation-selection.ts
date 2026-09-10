'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useConversation, useConversations } from '@/hooks/use-coach';
import { useOfflineSnapshot } from '@/hooks/use-offline-snapshot';
import { isSet } from '@/lib/util/value';
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
  const discussJournalAnalyses = searchParams.get('discussJournalAnalyses') === '1';
  const discussGoalId = searchParams.get('discussGoal');
  const discussRecordKey = searchParams.get('discussRecord');
  const discussConditionId = searchParams.get('discussCondition');
  const hasDiscussIntent = Boolean(
    discussId ||
    discussActivityId ||
    discussPlanningHorizon ||
    discussToday ||
    discussJournalAnalyses ||
    discussGoalId ||
    discussConditionId ||
    discussRecordKey,
  );
  return {
    discussId,
    discussActivityId,
    discussPlanningHorizon,
    discussToday,
    discussJournalAnalyses,
    discussGoalId,
    discussRecordKey,
    discussConditionId,
    hasDiscussIntent,
  };
}

type ConversationSelectionState = {
  activeId: string | null;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  ephemeralIds: Set<string>;
  setEphemeralIds: Dispatch<SetStateAction<Set<string>>>;
  autoReplyId: string | null;
  setAutoReplyId: Dispatch<SetStateAction<string | null>>;
};

function useConversationSelectionState(hasDiscussIntent: boolean): ConversationSelectionState {
  const initialDraftIdRef = useRef<string | null | undefined>(undefined);
  const [activeId, setActiveId] = useState<string | null>(() =>
    getInitialDraftId(hasDiscussIntent, initialDraftIdRef),
  );
  const [ephemeralIds, setEphemeralIds] = useState<Set<string>>(() => {
    const id = getInitialDraftId(hasDiscussIntent, initialDraftIdRef);
    return id ? new Set([id]) : new Set();
  });
  const [autoReplyId, setAutoReplyId] = useState<string | null>(null);
  return {
    activeId,
    setActiveId,
    ephemeralIds,
    setEphemeralIds,
    autoReplyId,
    setAutoReplyId,
  };
}

type RecoverEphemeralInput = {
  selectedId: string | null;
  isEphemeral: boolean;
  activeConversation: ReturnType<typeof useConversation>;
  setEphemeralIds: ConversationSelectionState['setEphemeralIds'];
  setActiveId: ConversationSelectionState['setActiveId'];
};

function useRecoverEphemeralWhenConversationMissing(input: RecoverEphemeralInput) {
  useEffect(() => {
    if (!input.selectedId || input.isEphemeral) {
      return;
    }
    if (input.activeConversation.isPending || input.activeConversation.isLoading) {
      return;
    }
    if (input.activeConversation.data) {
      return;
    }
    const id = createEphemeralId();
    input.setEphemeralIds((prev) => new Set(prev).add(id));
    input.setActiveId(id);
  }, [
    input.selectedId,
    input.isEphemeral,
    input.activeConversation.isPending,
    input.activeConversation.isLoading,
    input.activeConversation.data,
    input.setEphemeralIds,
    input.setActiveId,
  ]);
}

function useSelectedConversation(selectedId: string | null, ephemeralIds: Set<string>) {
  const isEphemeral = selectedId !== null && ephemeralIds.has(selectedId);
  const activeConversation = useConversation(isEphemeral ? null : selectedId);
  const activeHasMessages =
    !isEphemeral &&
    Array.isArray(activeConversation.data?.messages) &&
    activeConversation.data.messages.length > 0;
  return { isEphemeral, activeConversation, activeHasMessages };
}

function createConversationSelectionHandlers(
  selectedId: string | null,
  setActiveId: ConversationSelectionState['setActiveId'],
  setEphemeralIds: ConversationSelectionState['setEphemeralIds'],
  setAutoReplyId: ConversationSelectionState['setAutoReplyId'],
) {
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

  return { openNewConversation, handleConversationCreated };
}

export function useCoachConversationSelection(hasDiscussIntent: boolean, online: boolean) {
  const { activeId, setActiveId, ephemeralIds, setEphemeralIds, autoReplyId, setAutoReplyId } =
    useConversationSelectionState(hasDiscussIntent);

  const conversationsQuery = useConversations();
  const selectedId = activeId;
  const { isEphemeral, activeConversation, activeHasMessages } = useSelectedConversation(
    selectedId,
    ephemeralIds,
  );
  const hasNoLiveContent = !isSet(conversationsQuery.data) && !activeHasMessages;
  const { entry: offlineEntry } = useOfflineSnapshot(!online && hasNoLiveContent);

  useRecoverEphemeralWhenConversationMissing({
    selectedId,
    isEphemeral,
    activeConversation,
    setEphemeralIds,
    setActiveId,
  });

  const { openNewConversation, handleConversationCreated } = createConversationSelectionHandlers(
    selectedId,
    setActiveId,
    setEphemeralIds,
    setAutoReplyId,
  );

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
