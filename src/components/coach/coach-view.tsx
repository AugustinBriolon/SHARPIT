'use client';

import type { UIMessage } from 'ai';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { CoachChat } from '@/components/coach/coach-chat';
import { CoachConversationList } from '@/components/coach/coach-conversation-list';
import { PlanGenerator } from '@/components/coach/plan-generator';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
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
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
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
  const activeConversation = useConversation(selectedId);

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
    createConversation.mutateAsync().then((c) => setActiveId(c.id));
  }, [
    conversationsQuery.isPending,
    conversations.length,
    createConversation,
    discussId,
    discussActivityId,
    discussPlanningHorizon,
  ]);

  async function handleNewConversation() {
    const c = await createConversation.mutateAsync();
    setActiveId(c.id);
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

  const discussKey = discussId ?? discussActivityId ?? discussPlanningHorizon ?? 'free';

  return (
    <div className="space-y-6">
      <StickyHeader className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-medium uppercase">Coach</p>
          <h1 className="font-heading mt-2 text-3xl font-semibold">Fil & conversations</h1>
          <p className="text-muted-foreground mt-1">
            Messages du jour et chat libre avec ton coach.{' '}
            <Link className="text-primary hover:underline" href="/profil">
              Mon profil
            </Link>
          </p>
        </div>
        <Button onClick={() => setGeneratorOpen(true)}>
          <Sparkles className="size-4" />
          Générer ma semaine
        </Button>
      </StickyHeader>

      <div className="flex min-h-[70vh] flex-col gap-3 lg:h-[70vh] lg:flex-row lg:gap-4">
        <CoachConversationList
          activeId={selectedId}
          conversations={conversations}
          creating={createConversation.isPending}
          loading={conversationsQuery.isPending}
          onDelete={handleDeleteConversation}
          onNew={handleNewConversation}
          onSelect={setActiveId}
        />
        {selectedId && activeConversation.data ? (
          <CoachChat
            key={`${selectedId}-${discussKey}`}
            bootstrapPrompt={latchedBootstrapPrompt}
            conversationId={selectedId}
            initialMessages={
              (Array.isArray(activeConversation.data.messages)
                ? activeConversation.data.messages
                : []) as UIMessage[]
            }
          />
        ) : (
          <Skeleton className="min-h-[50vh] min-w-0 flex-1 rounded-xl lg:min-h-0" />
        )}
      </div>

      {generatorOpen && <PlanGenerator onClose={() => setGeneratorOpen(false)} />}
      {dialog}
    </div>
  );
}
