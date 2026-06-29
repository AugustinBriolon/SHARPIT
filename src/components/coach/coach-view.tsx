"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CoachChat } from "@/components/coach/coach-chat";
import { CoachContextPanel } from "@/components/coach/coach-context-panel";
import { CoachConversationList } from "@/components/coach/coach-conversation-list";
import { PlanGenerator } from "@/components/coach/plan-generator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
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

  // Au premier chargement : ouvre la conversation la plus récente, ou en crée une.
  useEffect(() => {
    if (initialized.current || conversationsQuery.isLoading) return;
    initialized.current = true;
    if (conversations.length > 0) {
      setActiveId(conversations[0].id);
    } else {
      createConversation.mutateAsync().then((c) => setActiveId(c.id));
    }
  }, [conversationsQuery.isLoading, conversations, createConversation]);

  async function handleNewConversation() {
    const c = await createConversation.mutateAsync();
    setActiveId(c.id);
  }

  async function handleDeleteConversation(id: string) {
    if (!confirm("Supprimer cette conversation ?")) return;
    const remaining = conversations.filter((c) => c.id !== id);
    await deleteConversation.mutateAsync(id);
    if (activeId === id) {
      if (remaining.length > 0) {
        setActiveId(remaining[0].id);
      } else {
        const c = await createConversation.mutateAsync();
        setActiveId(c.id);
      }
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
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
      </header>

      <CoachContextPanel />

      <div className="flex h-[70vh] flex-col gap-4 lg:flex-row">
        <CoachConversationList
          conversations={conversations}
          activeId={activeId}
          loading={conversationsQuery.isLoading}
          creating={createConversation.isPending}
          onSelect={setActiveId}
          onNew={handleNewConversation}
          onDelete={handleDeleteConversation}
        />
        {activeId ? (
          <CoachChat key={activeId} conversationId={activeId} />
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
