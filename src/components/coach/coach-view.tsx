"use client";

import type { UIMessage } from "ai";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { StickyHeader } from "@/components/layout/sticky-header";
import { CoachChat } from "@/components/coach/coach-chat";
import { CoachContextPanel } from "@/components/coach/coach-context-panel";
import { CoachConversationList } from "@/components/coach/coach-conversation-list";
import { PlanGenerator } from "@/components/coach/plan-generator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useConversation,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
} from "@/hooks/use-coach";

export function CoachView() {
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

  // Crée automatiquement une première conversation si l'historique est vide.
  useEffect(() => {
    if (conversationsQuery.isLoading || conversations.length > 0) return;
    if (initialized.current) return;
    initialized.current = true;
    createConversation.mutateAsync().then((c) => setActiveId(c.id));
  }, [conversationsQuery.isLoading, conversations.length, createConversation]);

  async function handleNewConversation() {
    const c = await createConversation.mutateAsync();
    setActiveId(c.id);
  }

  async function handleDeleteConversation(id: string) {
    if (!confirm("Supprimer cette conversation ?")) return;
    await deleteConversation.mutateAsync(id);
    // Si on supprime la conversation affichée, on retombe sur la plus récente
    // (dérivée) ; l'effet recrée une conversation si l'historique devient vide.
    if (selectedId === id) setActiveId(null);
  }

  return (
    <div className="space-y-6">
      <StickyHeader className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Coach IA
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
            Ton coach personnel
          </h1>
          <p className="mt-1 text-muted-foreground">
            Discute avec ton coach ou laisse-le construire tes prochaines
            séances à partir de tes données.
          </p>
        </div>
        <Button onClick={() => setGeneratorOpen(true)}>
          <Sparkles className="size-4" />
          Générer ma semaine
        </Button>
      </StickyHeader>

      <CoachContextPanel />

      <div className="flex h-[70vh] flex-col gap-4 lg:flex-row">
        <CoachConversationList
          conversations={conversations}
          activeId={selectedId}
          loading={conversationsQuery.isLoading}
          creating={createConversation.isPending}
          onSelect={setActiveId}
          onNew={handleNewConversation}
          onDelete={handleDeleteConversation}
        />
        {selectedId && activeConversation.data ? (
          <CoachChat
            key={selectedId}
            conversationId={selectedId}
            initialMessages={
              (Array.isArray(activeConversation.data.messages)
                ? activeConversation.data.messages
                : []) as UIMessage[]
            }
          />
        ) : (
          <Skeleton className="min-w-0 flex-1 rounded-xl" />
        )}
      </div>

      {generatorOpen && (
        <PlanGenerator onClose={() => setGeneratorOpen(false)} />
      )}
    </div>
  );
}
