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
import { Skeleton } from '@/components/ui/skeleton';
import {
  useConversation,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
} from '@/hooks/use-coach';
import { usePlannedSessions } from '@/hooks/use-data';
import { buildSessionDiscussPrompt } from '@/lib/coach-session-thread';
import { activityTypeLabels } from '@/lib/format';
import type { SessionAnalysis } from '@/lib/validators/coach';

export function CoachView() {
  const searchParams = useSearchParams();
  const discussId = searchParams.get('discuss');
  const plannedQuery = usePlannedSessions();
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const initialized = useRef(false);

  const conversationsQuery = useConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();

  const conversations = conversationsQuery.data ?? [];

  // Conversation affichée : sélection explicite, sinon la plus récente.
  const selectedId = activeId ?? conversations[0]?.id ?? null;
  const activeConversation = useConversation(selectedId);

  const discussBootstrapped = useRef(false);

  const bootstrapPrompt = useMemo(() => {
    if (!discussId) return undefined;
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
  }, [discussId, plannedQuery.data]);

  // Depuis « Discuter avec le coach », on ouvre une conversation vierge avec le contexte.
  useEffect(() => {
    if (!discussId || discussBootstrapped.current || plannedQuery.isPending) return;
    const session = (plannedQuery.data ?? []).find((s) => s.id === discussId);
    if (!session?.analysis) return;
    discussBootstrapped.current = true;
    createConversation.mutateAsync().then((c) => setActiveId(c.id));
  }, [discussId, plannedQuery.isPending, plannedQuery.data, createConversation]);

  // Crée automatiquement une première conversation si l'historique est vide.
  useEffect(() => {
    if (conversationsQuery.isPending || conversations.length > 0) return;
    if (initialized.current) return;
    initialized.current = true;
    createConversation.mutateAsync().then((c) => setActiveId(c.id));
  }, [conversationsQuery.isPending, conversations.length, createConversation]);

  async function handleNewConversation() {
    const c = await createConversation.mutateAsync();
    setActiveId(c.id);
  }

  async function handleDeleteConversation(id: string) {
    if (!confirm('Supprimer cette conversation ?')) return;
    await deleteConversation.mutateAsync(id);
    // Si on supprime la conversation affichée, on retombe sur la plus récente
    // (dérivée) ; l'effet recrée une conversation si l'historique devient vide.
    if (selectedId === id) setActiveId(null);
  }

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
            key={`${selectedId}-${discussId ?? 'free'}`}
            bootstrapPrompt={bootstrapPrompt}
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
    </div>
  );
}
