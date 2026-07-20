'use client';

import type { UIMessage } from 'ai';
import { MessageSquarePlus } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { CoachChat } from '@/components/coach/coach-chat';
import { CoachConversationList } from '@/components/coach/coach-conversation-list';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useConversation,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
} from '@/hooks/use-coach';
import { useActivities, usePlannedSessions } from '@/hooks/use-data';
import { useProjectedAthleteViewModel } from '@/hooks/use-projected-athlete-view-model';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import {
  buildActivityDiscussPrompt,
  buildPlanningDiscussPrompt,
  buildSessionDiscussPrompt,
} from '@/lib/coach-session-thread';
import { activityTypeLabels } from '@/lib/format';
import { parseSessionAnalysis } from '@/lib/session-analysis-display';
import type { SessionAnalysis } from '@/lib/validators/coach';

const inFlightDiscussBootstraps = new Set<string>();

export function CoachView() {
  const searchParams = useSearchParams();
  const discussId = searchParams.get('discuss');
  const discussActivityId = searchParams.get('discussActivity');
  const discussPlanningRaw = searchParams.get('discussPlanning');
  const discussPlanningHorizon = [1, 3, 7, 14].includes(Number(discussPlanningRaw))
    ? (Number(discussPlanningRaw) as ProjectionHorizonDays)
    : null;
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

  const selectedId = activeId ?? conversations[0]?.id ?? null;
  const isEphemeral = selectedId != null && ephemeralIds.has(selectedId);
  const activeConversation = useConversation(isEphemeral ? null : selectedId);

  const discussBootstrapped = useRef(false);

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
      });
    }

    if (discussId) {
      const session = (plannedQuery.data ?? []).find((s) => s.id === discussId);
      if (!session?.analysis) return undefined;
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
      if (!session?.analysis) return;
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

  useEffect(() => {
    if (discussId || discussActivityId || discussPlanningHorizon) return;
    if (conversationsQuery.isPending || conversations.length > 0) return;
    if (initialized.current) return;
    initialized.current = true;
    const id = crypto.randomUUID();
    setEphemeralIds((prev) => new Set(prev).add(id));
    setActiveId(id);
  }, [
    conversationsQuery.isPending,
    conversations.length,
    discussId,
    discussActivityId,
    discussPlanningHorizon,
  ]);

  function handleNewConversation() {
    const id = crypto.randomUUID();
    setEphemeralIds((prev) => new Set(prev).add(id));
    setActiveId(id);
  }

  async function handleDeleteConversation(id: string) {
    const confirmed = await confirm({
      title: 'Supprimer cette conversation ?',
      description: 'Cette action supprime définitivement son historique.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (!confirmed) return;
    await deleteConversation.mutateAsync(id);
    if (selectedId === id) setActiveId(null);
  }

  function resolveChatInitialMessages(): UIMessage[] {
    if (isEphemeral) return [];
    if (!Array.isArray(activeConversation.data?.messages)) return [];
    return activeConversation.data.messages as UIMessage[];
  }

  function renderChatPanel() {
    if (!selectedId) {
      return (
        <InkEmptyState
          className="min-h-[50vh] flex-1 lg:min-h-0"
          description="Sélectionne une conversation dans la liste ou démarre-en une nouvelle."
          icon={MessageSquarePlus}
          title="Aucune conversation ouverte"
          compact
        />
      );
    }

    if (isEphemeral || activeConversation.data) {
      return (
        <CoachChat
          key={selectedId}
          autoReply={autoReplyId === selectedId}
          bootstrapPrompt={latchedBootstrapPrompt}
          conversationId={selectedId}
          initialMessages={resolveChatInitialMessages()}
          isEphemeral={isEphemeral}
          onAutoReplyStarted={() => setAutoReplyId(null)}
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

    if (activeConversation.isLoading) {
      return <Skeleton className="min-h-[50vh] min-w-0 flex-1 rounded-xl lg:min-h-0" />;
    }

    return (
      <InkEmptyState
        className="min-h-[50vh] flex-1 lg:min-h-0"
        description="Sélectionne une conversation dans la liste ou démarre-en une nouvelle."
        icon={MessageSquarePlus}
        title="Conversation introuvable"
        compact
      />
    );
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
          onClick={handleNewConversation}
        >
          <MessageSquarePlus className="size-4" />
        </Button>
      </div>
      {conversationListEl}
    </div>
  );

  const mobileChatBody =
    selectedId && (isEphemeral || activeConversation.data) ? (
      <CoachChat
        key={selectedId}
        autoReply={autoReplyId === selectedId}
        bootstrapPrompt={latchedBootstrapPrompt}
        conversationId={selectedId}
        header={mobileHeader}
        initialMessages={resolveChatInitialMessages()}
        isEphemeral={isEphemeral}
        onAutoReplyStarted={() => setAutoReplyId(null)}
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
    ) : (
      <div className="flex h-full min-h-0 flex-col">
        {mobileHeader}
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          {selectedId && activeConversation.isLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : (
            <p className="text-muted-foreground text-sm">
              Sélectionne une conversation ou démarre-en une nouvelle.
            </p>
          )}
        </div>
      </div>
    );

  return (
    <div>
      {/* Mobile: fixed, app-like chat layout — header+list sticky/blurred over the
          scrolling thread, composer pinned to the screen bottom, page itself never
          scrolls. Ends exactly where BottomNav begins (see mobile-shell.tsx). */}
      <div
        className="bg-background safe-area-top fixed inset-x-0 top-0 z-30 flex flex-col lg:hidden"
        style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {mobileChatBody}
      </div>

      <div className="hidden space-y-6 lg:block">
        <StickyHeader className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-primary text-xs font-medium uppercase">Coach</p>
            <h1 className="text-page-title mt-1">Fil & conversations</h1>
            <p className="text-muted-foreground mt-1">
              Messages du jour et chat libre avec ton coach.{' '}
              <Link className="text-primary hover:underline" href="/profil">
                Mon profil
              </Link>
            </p>
          </div>
          <Button disabled={createConversation.isPending} onClick={handleNewConversation}>
            <MessageSquarePlus className="size-4" />
            Nouvelle conversation
          </Button>
        </StickyHeader>

        <div className="flex h-[calc(100dvh-190px)] flex-col gap-3 lg:flex-row lg:gap-4">
          {conversationListEl}
          {renderChatPanel()}
        </div>
      </div>

      {dialog}
    </div>
  );
}
