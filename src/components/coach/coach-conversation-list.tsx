'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquarePlus, Trash2 } from 'lucide-react';
import type { ClientConversationSummary } from '@/lib/query/fetchers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function CoachConversationList({
  conversations,
  activeId,
  loading,
  creating,
  onSelect,
  onNew,
  onDelete,
}: {
  conversations: ClientConversationSummary[];
  activeId: string | null;
  loading: boolean;
  creating: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside className="border-border/60 bg-card/30 flex w-full shrink-0 flex-col rounded-xl border lg:w-56">
      <div className="border-border/60 border-b p-2">
        <Button
          className="w-full justify-start gap-2"
          disabled={creating}
          size="sm"
          variant="outline"
          onClick={onNew}
        >
          <MessageSquarePlus className="size-4" />
          Nouvelle conversation
        </Button>
      </div>

      <div className="max-h-[60vh] flex-1 overflow-y-auto p-2 lg:max-h-[calc(70vh+3.5rem)]">
        {loading && <p className="text-muted-foreground px-2 py-3 text-xs">Chargement…</p>}
        {!loading && conversations.length === 0 && (
          <p className="text-muted-foreground px-2 py-3 text-xs">
            Aucune conversation pour l&apos;instant.
          </p>
        )}
        <ul className="space-y-0.5">
          {conversations.map((c) => (
            <li key={c.id}>
              <div
                className={cn(
                  'group flex items-center gap-1 rounded-lg transition-colors',
                  activeId === c.id ? 'bg-primary/10' : 'hover:bg-muted/50',
                )}
              >
                <button
                  className="min-w-0 flex-1 px-2.5 py-2 text-left"
                  type="button"
                  onClick={() => onSelect(c.id)}
                >
                  <p
                    className={cn(
                      'truncate text-sm',
                      activeId === c.id ? 'text-foreground font-medium' : 'text-muted-foreground',
                    )}
                  >
                    {c.title}
                  </p>
                  <p className="text-muted-foreground/80 mt-0.5 text-[10px]">
                    {formatDistanceToNow(c.updatedAt, {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                </button>
                <button
                  aria-label="Supprimer la conversation"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive mr-1 shrink-0 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c.id);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
