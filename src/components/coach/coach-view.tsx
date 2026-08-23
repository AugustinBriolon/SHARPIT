'use client';

import type { UIMessage } from 'ai';
import { MessageSquarePlus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CoachConversationList } from '@/components/coach/chat/coach-conversation-list';
import {
  CoachChatEmptyChrome,
  CoachChatPanelSkeleton,
  CoachPageHeader,
} from '@/components/coach/coach-hub-skeleton';
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
  buildActivityDiscussPrompt,
  buildGoalDiscussPrompt,
  buildPhysicalConditionDiscussPrompt,
  buildPlanningDiscussPrompt,
  buildPlannedSessionDiscussPrompt,
  buildRecordDiscussPrompt,
  buildSessionDiscussPrompt,
  buildTodayDiscussPrompt,
} from '@/lib/coach/chat/coach-discuss-prompts';
import {
  describeCoachDiscussContext,
  type CoachDiscussContext,
} from '@/lib/coach/chat/coach-discuss-context';
import { clearCoachInputDraft } from '@/lib/coach/chat/coach-input-draft';
import { warmCoachContext } from '@/lib/coach/warm-coach-context';
import { createClientId } from '@/lib/client-id';
import { activityTypeLabels } from '@/lib/format';
import { exposureLabels } from '@/lib/planned-session/sessions';
import { parseSessionAnalysis } from '@/lib/planned-session/display/session-analysis-display';
import type { SessionAnalysis } from '@/lib/validators/coach';
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

const CoachChat = dynamic(
  () => import('@/components/coach/chat/coach-chat').then((mod) => mod.CoachChat),
  {
    ssr: false,
    loading: () => <CoachChatPanelSkeleton />,
  },
);

function createEphemeralId(): string {
  return createClientId();
}

export function CoachView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const online = useOnlineStatus();
  const { guardDisabled } = useOfflineGuard();
  const isMobile = useIsMobile();
  // Viewport defaults to desktop (SSR + first paint) — no hub safety skeleton while mounting.
  const showMobileShell = isMobile;
  const showDesktopShell = !isMobile;
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ephemeralIds, setEphemeralIds] = useState<Set<string>>(() => new Set());
  const [autoReplyId, setAutoReplyId] = useState<string | null>(null);
  /** One-shot discuss bootstrap text — latched during render, not via effect→setState. */
  const latchedBootstrapPromptRef = useRef<string | undefined>(undefined);
  /** Latched with the prompt: the URL params are stripped once the thread exists. */
  const latchedContextRef = useRef<CoachDiscussContext | null>(null);
  const [, setBootstrapLatchEpoch] = useState(0);
  /** Once the discuss prompt is latched, ignore URL params (avoids re-prefill loops). */
  const discussPromptConsumed = useRef(false);
  const initialized = useRef(false);
  const { confirm, dialog } = useConfirmDialog();

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

  const discussBootstrapped = useRef(false);

  function clearLatchedBootstrapPrompt() {
    if (latchedBootstrapPromptRef.current === undefined) return;
    latchedBootstrapPromptRef.current = undefined;
    setBootstrapLatchEpoch((n) => n + 1);
  }

  /**
   * Dropping the attachment is the athlete's choice, not a consequence of the
   * prompt having been written into the composer — the two are cleared apart.
   */
  function detachLatchedContext() {
    if (latchedContextRef.current === null) return;
    latchedContextRef.current = null;
    setBootstrapLatchEpoch((n) => n + 1);
  }

  function openNewConversation() {
    const id = createEphemeralId();
    setEphemeralIds((prev) => new Set(prev).add(id));
    setActiveId(id);
    clearLatchedBootstrapPrompt();
    detachLatchedContext();
    discussPromptConsumed.current = false;
    return id;
  }

  function bootstrapDiscussConversation(bootstrapKey: string) {
    if (inFlightDiscussBootstraps.has(bootstrapKey)) return;
    inFlightDiscussBootstraps.add(bootstrapKey);
    discussBootstrapped.current = true;
    initialized.current = true;

    createConversation
      .mutateAsync({ bootstrapKey })
      .then((c) => {
        setActiveId(c.id);
        // Must use the Next router so useSearchParams drops discuss* (replaceState alone does not).
        router.replace('/coach', { scroll: false });
      })
      .finally(() => {
        inFlightDiscussBootstraps.delete(bootstrapKey);
      });
  }

  const bootstrapPrompt = useMemo(() => {
    if (discussPromptConsumed.current) return undefined;

    if (discussToday) {
      const vm = todayQuery.data;
      if (!vm) return undefined;
      return buildTodayDiscussPrompt({
        verdictLabel: vm.hero.headline,
        phaseQuestion: vm.hero.eyebrow,
        limitingFactor: vm.hero.twinTrustStrip.limitingCauseText,
        confidenceLabel: vm.hero.twinTrustStrip.confidenceLabel,
        sessionTitle: vm.hero.actionLine,
      });
    }

    if (discussGoalId) {
      const goal = (goalsQuery.data ?? []).find((g) => g.id === discussGoalId);
      if (!goal) return undefined;
      const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
      const daysRemaining = targetDate
        ? Math.ceil((targetDate.getTime() - Date.now()) / 86_400_000)
        : null;
      return buildGoalDiscussPrompt({
        title: goal.title,
        targetDate,
        daysRemaining: daysRemaining != null && daysRemaining >= 0 ? daysRemaining : null,
        targetPerformance: goal.targetPerformance,
        currentValue: goal.currentValue,
        targetValue: goal.targetValue,
        unit: goal.unit,
      });
    }

    if (discussConditionId) {
      const note = (physicalNotesQuery.data ?? []).find((n) => n.id === discussConditionId);
      if (!note) return undefined;
      return buildPhysicalConditionDiscussPrompt({
        title: note.title,
        bodyPart: note.bodyPart,
        severity: note.severity,
        startedOn: note.startDate ? new Date(note.startDate) : null,
        affectsTraining: note.affectsTraining,
        description: note.description,
      });
    }

    if (discussRecordKey) {
      const found = findRecordCategory(recordsQuery.data, discussRecordKey);
      if (!found) return undefined;
      const best = found.category.entries[0] ?? null;
      return buildRecordDiscussPrompt({
        categoryLabel: found.category.label,
        sportLabel: found.sportLabel,
        bestLabel: best?.displayValue ?? null,
        achievedOn: best?.date ? new Date(best.date) : null,
      });
    }

    if (discussPlanningHorizon) {
      const projection = projectionQuery.data;
      if (!projection?.visible) return undefined;
      return buildPlanningDiscussPrompt({
        synthesisSentence: projection.synthesisSentence,
        horizonDays: discussPlanningHorizon,
        caution: projection.caution,
      });
    }

    if (discussId) {
      const session = (plannedQuery.data ?? []).find((s) => s.id === discussId);
      if (!session) return undefined;

      if (session.analysis) {
        return buildSessionDiscussPrompt({
          title: session.title,
          sportLabel: activityTypeLabels[session.type],
          analysis: session.analysis as unknown as SessionAnalysis,
          planned: {
            durationMin: session.durationMin,
            description: session.description,
            intensity: session.intensity,
          },
          actual: session.activity
            ? {
                title: session.activity.title,
                durationSec: session.activity.duration,
                notes: session.activity.notes,
              }
            : undefined,
        });
      }

      const exposure = session.exposureSetting as
        'INDOOR' | 'OUTDOOR' | 'UNKNOWN' | null | undefined;

      return buildPlannedSessionDiscussPrompt({
        title: session.title,
        sportLabel: activityTypeLabels[session.type],
        date: new Date(session.date),
        startTime: session.startTime,
        durationMin: session.durationMin,
        load: session.load,
        intensity: session.intensity,
        description: session.description,
        exposureLabel: exposure ? exposureLabels[exposure] : null,
        locationLabel: session.locationLabel,
      });
    }

    if (!discussActivityId) return undefined;
    const activity = (activitiesQuery.data ?? []).find((a) => a.id === discussActivityId);
    if (!activity) return undefined;

    const planned = activity.plannedSession;
    const analysis = planned ? parseSessionAnalysis(planned.analysis) : null;

    return buildActivityDiscussPrompt({
      title: activity.title,
      sportLabel: activityTypeLabels[activity.type],
      date: activity.date,
      durationSec: activity.duration,
      load: activity.load,
      rpe: activity.rpe,
      notes: activity.notes,
      analysis,
      planned: planned
        ? {
            title: planned.title,
            durationMin: planned.durationMin,
            description: planned.description,
            intensity: planned.intensity,
          }
        : undefined,
    });
  }, [
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

  // Latch the first non-empty discuss prompt during render (one-shot).
  if (bootstrapPrompt && !discussPromptConsumed.current) {
    discussPromptConsumed.current = true;
    latchedBootstrapPromptRef.current = bootstrapPrompt;
    latchedContextRef.current = discussContext;
  }
  const latchedBootstrapPrompt = latchedBootstrapPromptRef.current;
  const latchedContext = latchedContextRef.current;

  useEffect(() => {
    if (discussBootstrapped.current) return;
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
  ]);

  /** Always land on a blank “Nouvelle conversation” — never an empty selection state. */
  useLayoutEffect(() => {
    if (hasDiscussIntent) return;
    if (initialized.current) return;
    initialized.current = true;
    const id = createEphemeralId();
    setEphemeralIds(new Set([id]));
    setActiveId(id);
  }, [hasDiscussIntent]);

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
      clearLatchedBootstrapPrompt();
      discussPromptConsumed.current = false;
    }
  }

  function resolveChatInitialMessages(): UIMessage[] {
    if (isEphemeral) return [];
    if (!Array.isArray(activeConversation.data?.messages)) return [];
    return activeConversation.data.messages as UIMessage[];
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
      return <CoachChatEmptyChrome header={header} />;
    }

    if (isEphemeral || activeConversation.data) {
      return (
        <CoachChat
          key={selectedId}
          attachedContext={latchedContext}
          autoReply={autoReplyId === selectedId}
          bootstrapPrompt={latchedBootstrapPrompt}
          conversationId={selectedId}
          header={header}
          initialMessages={resolveChatInitialMessages()}
          isEphemeral={isEphemeral}
          onAutoReplyStarted={() => setAutoReplyId(null)}
          onBootstrapApplied={() => clearLatchedBootstrapPrompt()}
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

    return <CoachChatPanelSkeleton header={header} />;
  }

  const conversationListEl = (
    <CoachConversationList
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
    <div className="flex flex-col gap-2 px-3 pt-2 pb-2">
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
          <MessageSquarePlus className="size-4.5" />
        </Button>
      </div>
      {conversationListEl}
    </div>
  );

  return (
    <div>
      {/* Exactly one CoachChat in the tree (mobile XOR desktop). */}
      {showMobileShell ? (
        <div
          className="bg-background safe-area-top fixed inset-x-0 top-0 z-30 flex flex-col"
          style={{ bottom: 'var(--bottom-nav-offset)' }}
        >
          {renderChat(mobileHeader)}
        </div>
      ) : null}

      {showDesktopShell ? (
        <div className="space-y-6">
          <CoachPageHeader />
          <div className="flex h-[calc(100dvh-190px)] flex-col gap-3 lg:flex-row lg:gap-4">
            {conversationListEl}
            {renderChat()}
          </div>
        </div>
      ) : null}

      {dialog}
    </div>
  );
}
