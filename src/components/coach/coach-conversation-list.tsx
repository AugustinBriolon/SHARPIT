'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ClientConversationSummary } from '@/lib/query/fetchers';

function conversationLabel(c: ClientConversationSummary): string {
  const title = c.title.trim();
  return title || 'Nouvelle conversation';
}

export function CoachConversationList({
  conversations,
  activeId,
  loading,
  onSelect,
  onDelete,
}: {
  conversations: ClientConversationSummary[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const selectedId = activeId ?? conversations[0]?.id ?? '';
  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <aside className="border-border/60 bg-card/30 flex w-full shrink-0 flex-col rounded-xl border lg:h-full lg:w-56">
      {loading && <p className="text-muted-foreground px-3 py-2 text-xs">Chargement…</p>}

      {!loading && conversations.length === 0 && (
        <p className="text-muted-foreground px-3 py-2 text-xs">
          Aucune conversation pour l&apos;instant.
        </p>
      )}

      {!loading && conversations.length > 0 && (
        <>
          <div className="flex items-center gap-1.5 p-2 lg:hidden">
            <div className="min-w-0 flex-1">
              <Select
                value={selectedId}
                onValueChange={(value) => {
                  if (value) onSelect(value);
                }}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Choisir une conversation">
                    {selected ? conversationLabel(selected) : 'Choisir une conversation'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {conversations.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="block truncate">{conversationLabel(c)}</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {formatDistanceToNow(c.updatedAt, { addSuffix: true, locale: fr })}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {activeId && (
              <Button
                aria-label="Supprimer la conversation"
                className="text-muted-foreground hover:text-destructive shrink-0"
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={() => onDelete(activeId)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>

          <div className="hidden max-h-[60vh] flex-1 overflow-y-auto overscroll-x-contain p-2 lg:block lg:max-h-none">
            <ul className="space-y-1">
              {conversations.map((c) => {
                const isActive = c.id === activeId;
                return (
                  <li key={c.id} className="group flex items-center">
                    <button
                      type="button"
                      className={cn(
                        'min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-sm transition-colors',
                        isActive
                          ? 'bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                      )}
                      onClick={() => onSelect(c.id)}
                    >
                      <span className="block truncate font-medium">{conversationLabel(c)}</span>
                      <span className="text-muted-foreground block text-xs">
                        {formatDistanceToNow(c.updatedAt, { addSuffix: true, locale: fr })}
                      </span>
                    </button>
                    <Button
                      aria-label="Supprimer la conversation"
                      className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                      onClick={() => onDelete(c.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </aside>
  );
}
