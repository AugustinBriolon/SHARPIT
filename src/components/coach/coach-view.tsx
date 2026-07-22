'use client';

import type { UIMessage } from 'ai';
import { MessageSquarePlus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CoachChat } from '@/components/coach/chat/coach-chat';
import { CoachConversationList } from '@/components/coach/chat/coach-conversation-list';
import {
  CoachChatEmptyChrome,
  CoachChatPanelSkeleton,
  CoachPageHeader,
} from '@/components/coach/coach-hub-skeleton';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useConversation,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
} from '@/hooks/use-coach';
import { useActivities, usePlannedSessions } from '@/hooks/use-data';
import { useIsMobile } from '@/hooks/use-viewport';
import { useProjectedAthleteViewModel } from '@/hooks/use-projected-athlete-view-model';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import {
  buildActivityDiscussPrompt,
  buildPlanningDiscussPrompt,
  buildPlannedSessionDiscussPrompt,
  buildSessionDiscussPrompt,
} from '@/lib/coach/coach-session-thread';
import { clearCoachInputDraft } from '@/lib/coach/coach-input-draft';
import { activityTypeLabels } from '@/lib/format';
import { exposureLabels } from '@/lib/planned-session/sessions';
import { parseSessionAnalysis } from '@/lib/planned-session/session-analysis-display';
import type { SessionAnalysis } from '@/lib/validators/coach';

const inFlightDiscussBootstraps = new Set<string>();

function createEphemeralId(): string {
  return crypto.randomUUID();
}

export function CoachView() {
  const searchParams = useSearchParams();
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
  const hasDiscussIntent = Boolean(discussId || discussActivityId || discussPlanningHorizon);
  const plannedQuery = usePlannedSessions();
  const activitiesQuery = useActivities();
  const projectionQuery = useProjectedAthleteViewModel(discussPlanningHorizon ?? 7);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ephemeralIds, setEphemeralIds] = useState<Set<string>>(() => new Set());
  const [autoReplyId, setAutoReplyId] = useState<string | null>(null);
  const [latchedBootstrapPrompt, setLatchedBootstrapPrompt] = useState<string | undefined>(
    undefined,
  );
  const initialized = useRef(false);
  const { confirm, dialog } = useConfirmDialog();

  const conversationsQuery = useConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();

  const conversations = conversationsQuery.data ?? [];

  const selectedId = activeId;
  const isEphemeral = selectedId != null && ephemeralIds.has(selectedId);
  const activeConversation = useConversation(isEphemeral ? null : selectedId);

  const discussBootstrapped = useRef(false);

  function openNewConversation() {
    const id = createEphemeralId();
    setEphemeralIds((prev) => new Set(prev).add(id));
    setActiveId(id);
    setLatchedBootstrapPrompt(undefined);
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
        if (typeof window !== 'undefined') {
          window.history.replaceState(window.history.state, '', '/coach');
        }
      })
      .finally(() => {
        inFlightDiscussBootstraps.delete(bootstrapKey);
      });
  }

  const bootstrapPrompt = useMemo(() => {
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
    plannedQuery.data,
    activitiesQuery.data,
  ]);

  useEffect(() => {
    if (!bootstrapPrompt || latchedBootstrapPrompt) return;
    setLatchedBootstrapPrompt(bootstrapPrompt);
  }, [bootstrapPrompt, latchedBootstrapPrompt]);

  useEffect(() => {
    if (discussBootstrapped.current) return;
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
      setLatchedBootstrapPrompt(undefined);
    }
  }

  function resolveChatInitialMessages(): UIMessage[] {
    if (isEphemeral) return [];
    if (!Array.isArray(activeConversation.data?.messages)) return [];
    return activeConversation.data.messages as UIMessage[];
  }

  function renderChat(header?: React.ReactNode) {
    if (!selectedId) {
      return <CoachChatEmptyChrome header={header} />;
    }

    if (isEphemeral || activeConversation.data) {
      return (
        <CoachChat
          key={selectedId}
          autoReply={autoReplyId === selectedId}
          bootstrapPrompt={latchedBootstrapPrompt}
          conversationId={selectedId}
          header={header}
          initialMessages={resolveChatInitialMessages()}
          isEphemeral={isEphemeral}
          onAutoReplyStarted={() => setAutoReplyId(null)}
          onBootstrapApplied={() => setLatchedBootstrapPrompt(undefined)}
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
      onDelete={handleDeleteConversation}
      onSelect={setActiveId}
    />
  );

  const mobileHeader = (
    <div className="flex flex-col gap-2 px-3 pt-2 pb-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-page-title truncate">Fil & conversations</h1>
        <Button
          aria-label="Nouvelle conversation"
          disabled={createConversation.isPending}
          size="icon"
          variant="outline"
          onClick={openNewConversation}
        >
          <MessageSquarePlus className="size-4" />
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
          style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {renderChat(mobileHeader)}
        </div>
      ) : null}

      {showDesktopShell ? (
        <div className="space-y-6">
          <CoachPageHeader
            newDisabled={createConversation.isPending}
            onNewConversation={openNewConversation}
          />
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
