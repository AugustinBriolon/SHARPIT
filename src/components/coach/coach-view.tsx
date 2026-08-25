'use client';

import type { UIMessage } from 'ai';
import { MessageSquarePlus } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CoachChat } from '@/components/coach/chat/coach-chat';
import { CoachChatPanelShell } from '@/components/coach/chat/coach-chat-panel-shell';
import { CoachConversationList } from '@/components/coach/chat/coach-conversation-list';
import { CoachPageHeader } from '@/components/coach/coach-hub-skeleton';
import { OfflineSnapshotSummary } from '@/components/pwa/offline-snapshot-summary';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useConversation,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useRenameConversation,
} from '@/hooks/use-coach';
import { useActivities, useGoals, usePlannedSessions, useRecords } from '@/hooks/use-data';
import { usePhysicalNotes } from '@/hooks/use-physical';
import { useTodayPresentationViewModel } from '@/hooks/use-presentation-view-model';
import { useOfflineSnapshot } from '@/hooks/use-offline-snapshot';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useIsMobile } from '@/hooks/use-viewport';
import { useProjectedAthleteViewModel } from '@/hooks/use-projected-athlete-view-model';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import {
  describeCoachDiscussContext,
  type CoachDiscussContext,
} from '@/lib/coach/chat/coach-discuss-context';
import { clearCoachInputDraft } from '@/lib/coach/chat/coach-input-draft';
import { warmCoachContext } from '@/lib/coach/warm-coach-context';
import { createClientId } from '@/lib/client-id';
import type { RecordCategory } from '@/lib/training/records';

const inFlightDiscussBootstraps = new Set<string>();

const RECORD_SPORT_LABEL = { run: 'course', bike: 'vélo', swim: 'natation' } as const;

/** Records are grouped by sport, so the sport is recovered from where the key sits. */
function findRecordCategory(
  payload:
    { prs: { run: RecordCategory[]; bike: RecordCategory[]; swim: RecordCategory[] } } | undefined,
  key: string,
): { category: RecordCategory; sportLabel: string } | null {
  if (!payload) return null;
  for (const sport of ['run', 'bike', 'swim'] as const) {
    const category = payload.prs[sport].find((c) => c.key === key);
    if (category) return { category, sportLabel: RECORD_SPORT_LABEL[sport] };
  }
  return null;
}

function createEphemeralId(): string {
  return createClientId();
}

function getInitialDraftId(
  hasDiscuss: boolean,
  cache: { current: string | null | undefined },
): string | null {
  if (cache.current !== undefined) return cache.current;
  cache.current = hasDiscuss ? null : createEphemeralId();
  return cache.current;
}

export function CoachView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const online = useOnlineStatus();
  const { guardDisabled } = useOfflineGuard();
  const isMobile = useIsMobile();
  const [viewportReady, setViewportReady] = useState(false);
  const initialDraftIdRef = useRef<string | null | undefined>(undefined);
  const discussId = searchParams.get('discuss');
  const discussActivityId = searchParams.get('discussActivity');
  const discussPlanningRaw = searchParams.get('discussPlanning');
  const discussPlanningHorizon = [1, 3, 7, 14].includes(Number(discussPlanningRaw))
    ? (Number(discussPlanningRaw) as ProjectionHorizonDays)
    : null;
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
  const plannedQuery = usePlannedSessions();
  const activitiesQuery = useActivities();
  const projectionQuery = useProjectedAthleteViewModel(discussPlanningHorizon ?? 7);
  const goalsQuery = useGoals();
  const physicalNotesQuery = usePhysicalNotes();
  const todayQuery = useTodayPresentationViewModel(format(new Date(), 'yyyy-MM-dd'));
  const recordsQuery = useRecords();
  const [activeId, setActiveId] = useState<string | null>(() =>
    getInitialDraftId(hasDiscussIntent, initialDraftIdRef),
  );
  const [ephemeralIds, setEphemeralIds] = useState<Set<string>>(() => {
    const id = getInitialDraftId(hasDiscussIntent, initialDraftIdRef);
    return id ? new Set([id]) : new Set();
  });
  const [autoReplyId, setAutoReplyId] = useState<string | null>(null);
  /** Latched discuss context — URL params are stripped once the thread exists. */
  const latchedContextRef = useRef<CoachDiscussContext | null>(null);
  const [contextLatchEpoch, setContextLatchEpoch] = useState(0);
  /** Blocks re-latch until the athlete dismisses the chip or opens a fresh draft. */
  const latchedDiscussIntentKey = useRef<string | null>(null);
  /** One bootstrap per discuss intent — reset on dismiss so re-entry from a surface works. */
  const bootstrappedDiscussIntentKey = useRef<string | null>(null);
  const initialized = useRef(false);
  const { confirm, dialog } = useConfirmDialog();

  /** Avoid mounting two CoachChat instances — pick the shell once the viewport is known. */
  useLayoutEffect(() => {
    setViewportReady(true);
  }, []);

  // Warm coach context cache so the first message hits TTL memory.
  useEffect(() => {
    if (!online) return;
    warmCoachContext();
  }, [online]);

  const conversationsQuery = useConversations();
  const createConversation = useCreateConversation();
  const renameConversation = useRenameConversation();
  const deleteConversation = useDeleteConversation();

  const conversations = conversationsQuery.data ?? [];

  const selectedId = activeId;
  const isEphemeral = selectedId != null && ephemeralIds.has(selectedId);
  const activeConversation = useConversation(isEphemeral ? null : selectedId);
  const activeHasMessages =
    !isEphemeral &&
    Array.isArray(activeConversation.data?.messages) &&
    activeConversation.data.messages.length > 0;
  const hasNoLiveContent = conversationsQuery.data == null && !activeHasMessages;
  const { entry: offlineEntry } = useOfflineSnapshot(!online && hasNoLiveContent);

  const discussIntentKey = useMemo(() => {
    if (discussToday) return 'today';
    if (discussGoalId) return `goal:${discussGoalId}`;
    if (discussConditionId) return `condition:${discussConditionId}`;
    if (discussRecordKey) return `record:${discussRecordKey}`;
    if (discussPlanningHorizon) return `planning:${discussPlanningHorizon}`;
    if (discussId) return `session:${discussId}`;
    if (discussActivityId) return `activity:${discussActivityId}`;
    return null;
  }, [
    discussToday,
    discussGoalId,
    discussConditionId,
    discussRecordKey,
    discussPlanningHorizon,
    discussId,
    discussActivityId,
  ]);

  /**
   * Dropping the attachment is the athlete's choice — context stays until they
   * clear the chip, independent of whatever they type in the composer.
   */
  function detachLatchedContext() {
    if (latchedContextRef.current === null && latchedDiscussIntentKey.current === null) return;
    latchedContextRef.current = null;
    latchedDiscussIntentKey.current = null;
    bootstrappedDiscussIntentKey.current = null;
    setContextLatchEpoch((n) => n + 1);
  }

  function openNewConversation() {
    const id = createEphemeralId();
    setEphemeralIds((prev) => new Set(prev).add(id));
    setActiveId(id);
    detachLatchedContext();
    return id;
  }

  function bootstrapDiscussConversation(bootstrapKey: string) {
    if (!discussIntentKey) return;
    if (inFlightDiscussBootstraps.has(bootstrapKey)) return;
    if (bootstrappedDiscussIntentKey.current === discussIntentKey) return;
    inFlightDiscussBootstraps.add(bootstrapKey);
    initialized.current = true;

    createConversation
      .mutateAsync({ bootstrapKey })
      .then((c) => {
        bootstrappedDiscussIntentKey.current = discussIntentKey;
        setActiveId(c.id);
        // Must use the Next router so useSearchParams drops discuss* (replaceState alone does not).
        router.replace('/coach', { scroll: false });
      })
      .catch(() => {
        bootstrappedDiscussIntentKey.current = null;
      })
      .finally(() => {
        inFlightDiscussBootstraps.delete(bootstrapKey);
      });
  }

  const discussDataReady = useMemo(() => {
    if (!hasDiscussIntent || !discussIntentKey) return false;
    if (latchedDiscussIntentKey.current === discussIntentKey) return false;
    if (discussToday) return todayQuery.data != null;
    if (discussGoalId) return (goalsQuery.data ?? []).some((g) => g.id === discussGoalId);
    if (discussConditionId) {
      return (physicalNotesQuery.data ?? []).some((n) => n.id === discussConditionId);
    }
    if (discussRecordKey) return findRecordCategory(recordsQuery.data, discussRecordKey) != null;
    if (discussPlanningHorizon) return projectionQuery.data?.visible === true;
    if (discussId) return (plannedQuery.data ?? []).some((s) => s.id === discussId);
    if (discussActivityId) {
      return (activitiesQuery.data ?? []).some((a) => a.id === discussActivityId);
    }
    return false;
  }, [
    hasDiscussIntent,
    discussIntentKey,
    contextLatchEpoch,
    discussPlanningHorizon,
    projectionQuery.data,
    discussId,
    discussActivityId,
    discussToday,
    discussGoalId,
    discussConditionId,
    discussRecordKey,
    plannedQuery.data,
    activitiesQuery.data,
    goalsQuery.data,
    physicalNotesQuery.data,
    todayQuery.data,
    recordsQuery.data,
  ]);

  const discussContext = useMemo((): CoachDiscussContext | null => {
    if (discussToday) return describeCoachDiscussContext({ kind: 'today' });
    if (discussGoalId) {
      const goal = (goalsQuery.data ?? []).find((g) => g.id === discussGoalId);
      return describeCoachDiscussContext({ kind: 'goal', goalId: discussGoalId }, goal?.title);
    }
    if (discussConditionId) {
      const note = (physicalNotesQuery.data ?? []).find((n) => n.id === discussConditionId);
      return describeCoachDiscussContext(
        { kind: 'physical-condition', noteId: discussConditionId },
        note?.title,
      );
    }
    if (discussRecordKey) {
      const found = findRecordCategory(recordsQuery.data, discussRecordKey);
      return describeCoachDiscussContext(
        { kind: 'record', categoryKey: discussRecordKey },
        found ? `${found.category.label} · ${found.sportLabel}` : null,
      );
    }
    if (discussPlanningHorizon) {
      return describeCoachDiscussContext({
        kind: 'planning',
        horizonDays: discussPlanningHorizon,
      });
    }
    if (discussId) {
      const session = (plannedQuery.data ?? []).find((sn) => sn.id === discussId);
      return describeCoachDiscussContext(
        { kind: 'planned-session', sessionId: discussId },
        session?.title,
      );
    }
    if (discussActivityId) {
      const activity = (activitiesQuery.data ?? []).find((a) => a.id === discussActivityId);
      return describeCoachDiscussContext(
        { kind: 'activity', activityId: discussActivityId },
        activity?.title,
      );
    }
    return null;
  }, [
    discussToday,
    discussGoalId,
    discussConditionId,
    discussRecordKey,
    discussPlanningHorizon,
    discussId,
    discussActivityId,
    goalsQuery.data,
    physicalNotesQuery.data,
    recordsQuery.data,
    plannedQuery.data,
    activitiesQuery.data,
  ]);

  // Latch discuss context during render once the target data is ready (one-shot per intent).
  if (discussDataReady && discussContext && discussIntentKey) {
    latchedDiscussIntentKey.current = discussIntentKey;
    latchedContextRef.current = discussContext;
  }
  const latchedContext = latchedContextRef.current;

  useEffect(() => {
    if (!discussIntentKey) return;
    if (bootstrappedDiscussIntentKey.current === discussIntentKey) return;
    if (discussToday) {
      if (todayQuery.isPending) return;
      if (!todayQuery.data) return;
      bootstrapDiscussConversation('today');
      return;
    }
    if (discussGoalId) {
      if (goalsQuery.isPending) return;
      if (!(goalsQuery.data ?? []).some((g) => g.id === discussGoalId)) return;
      bootstrapDiscussConversation(`goal:${discussGoalId}`);
      return;
    }
    if (discussConditionId) {
      if (physicalNotesQuery.isPending) return;
      if (!(physicalNotesQuery.data ?? []).some((n) => n.id === discussConditionId)) return;
      bootstrapDiscussConversation(`condition:${discussConditionId}`);
      return;
    }
    if (discussRecordKey) {
      if (recordsQuery.isPending) return;
      if (!findRecordCategory(recordsQuery.data, discussRecordKey)) return;
      bootstrapDiscussConversation(`record:${discussRecordKey}`);
      return;
    }
    if (discussPlanningHorizon) {
      if (projectionQuery.isPending) return;
      if (!projectionQuery.data?.visible) return;
      bootstrapDiscussConversation(`planning:${discussPlanningHorizon}`);
      return;
    }
    if (discussId) {
      if (plannedQuery.isPending) return;
      const session = (plannedQuery.data ?? []).find((s) => s.id === discussId);
      if (!session) return;
      bootstrapDiscussConversation(`session:${discussId}`);
      return;
    }
    if (discussActivityId) {
      if (activitiesQuery.isPending) return;
      const activity = (activitiesQuery.data ?? []).find((a) => a.id === discussActivityId);
      if (!activity) return;
      bootstrapDiscussConversation(`activity:${discussActivityId}`);
    }
  }, [
    discussPlanningHorizon,
    projectionQuery.isPending,
    projectionQuery.data,
    discussId,
    discussActivityId,
    plannedQuery.isPending,
    plannedQuery.data,
    activitiesQuery.isPending,
    activitiesQuery.data,
    discussToday,
    todayQuery.isPending,
    todayQuery.data,
    discussGoalId,
    goalsQuery.isPending,
    goalsQuery.data,
    discussConditionId,
    physicalNotesQuery.isPending,
    physicalNotesQuery.data,
    discussRecordKey,
    recordsQuery.isPending,
    recordsQuery.data,
    createConversation,
    discussIntentKey,
  ]);

  /** Deleted / missing thread → open a fresh draft instead of an empty pane. */
  useEffect(() => {
    if (!selectedId || isEphemeral) return;
    if (activeConversation.isPending || activeConversation.isLoading) return;
    if (activeConversation.data) return;
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

  async function handleDeleteConversation(id: string) {
    const confirmed = await confirm({
      title: 'Supprimer cette conversation ?',
      description: 'Cette action supprime définitivement son historique.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (!confirmed) return;
    await deleteConversation.mutateAsync(id);
    clearCoachInputDraft(id);
    if (selectedId === id) {
      const nextId = createEphemeralId();
      setEphemeralIds((prev) => new Set(prev).add(nextId));
      setActiveId(nextId);
      detachLatchedContext();
    }
  }

  function renderChat(header?: React.ReactNode) {
    if (!online && hasNoLiveContent && offlineEntry) {
      return (
        <>
          {header}
          <OfflineSnapshotSummary entry={offlineEntry} />
        </>
      );
    }

    if (!selectedId) {
      return <CoachChatPanelShell header={header} />;
    }

    if (isEphemeral) {
      return (
        <CoachChat
          key={selectedId}
          attachedContext={latchedContext}
          autoReply={autoReplyId === selectedId}
          conversationId={selectedId}
          header={header}
          initialMessages={[]}
          isEphemeral
          onAutoReplyStarted={() => setAutoReplyId(null)}
          onDetachContext={() => detachLatchedContext()}
          onConversationCreated={(id) => {
            setEphemeralIds((prev) => {
              const next = new Set(prev);
              next.delete(selectedId);
              return next;
            });
            setActiveId(id);
            setAutoReplyId(id);
          }}
        />
      );
    }

    if (activeConversation.isPending || activeConversation.isLoading || !activeConversation.data) {
      return <CoachChatPanelShell header={header} />;
    }

    return (
      <CoachChat
        key={selectedId}
        attachedContext={latchedContext}
        autoReply={autoReplyId === selectedId}
        conversationId={selectedId}
        header={header}
        initialMessages={activeConversation.data.messages as UIMessage[]}
        isEphemeral={false}
        onAutoReplyStarted={() => setAutoReplyId(null)}
        onDetachContext={() => detachLatchedContext()}
        onConversationCreated={(id) => {
          setEphemeralIds((prev) => {
            const next = new Set(prev);
            next.delete(selectedId);
            return next;
          });
          setActiveId(id);
          setAutoReplyId(id);
        }}
      />
    );
  }

  const conversationListEl = (
    <CoachConversationList
      activeDraft={isEphemeral}
      activeId={selectedId}
      conversations={conversations}
      loading={conversationsQuery.isPending}
      newDisabled={createConversation.isPending || guardDisabled}
      onDelete={handleDeleteConversation}
      onNewConversation={openNewConversation}
      onRename={(id, title) => renameConversation.mutate({ id, title })}
      onSelect={setActiveId}
    />
  );

  const mobileHeader = (
    <div className="flex flex-col gap-2 py-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-page-title truncate">Fil & conversations</h1>
        <Button
          aria-label="Nouvelle conversation"
          className="size-11"
          disabled={createConversation.isPending || guardDisabled}
          size="icon"
          variant="highlight"
          onClick={openNewConversation}
        >
          <MessageSquarePlus className="size-4.5" aria-hidden />
        </Button>
      </div>
      {conversationListEl}
    </div>
  );

  const mountLiveChat = viewportReady || (!isMobile && isEphemeral);

  const desktopHub = (
    <div className="hidden space-y-6 lg:block">
      <CoachPageHeader />
      <div className="flex h-[calc(100dvh-190px)] flex-col gap-3 lg:flex-row lg:gap-4">
        {conversationListEl}
        {mountLiveChat && !isMobile ? renderChat() : <CoachChatPanelShell />}
      </div>
    </div>
  );

  const mobileHub = (
    <div
      className="bg-background safe-area-top fixed inset-x-0 top-0 z-30 flex flex-col lg:hidden"
      style={{ bottom: 'var(--bottom-nav-offset)' }}
    >
      {mountLiveChat && isMobile ? (
        renderChat(mobileHeader)
      ) : (
        <CoachChatPanelShell header={mobileHeader} />
      )}
    </div>
  );

  return (
    <div>
      {mobileHub}
      {desktopHub}
      {dialog}
    </div>
  );
}
