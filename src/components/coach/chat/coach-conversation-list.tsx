'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronDownIcon, MessageSquarePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { cn } from '@/lib/utils';
import type { ClientConversationSummary } from '@/lib/query/fetchers';

function conversationLabel(c: ClientConversationSummary): string {
  const title = c.title.trim();
  return title || 'Nouvelle conversation';
}

/** Mobile Select chrome — only the label text skeletons while conversations load. */
function MobileSelectLoadingRow() {
  return (
    <div className="flex items-center gap-1.5 p-2 lg:hidden" aria-busy>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'border-input flex h-8 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border',
            'bg-transparent py-2 pr-2 pl-2.5 text-sm',
          )}
        >
          <SkeletonDataValue heightClassName="h-3.5" widthClassName="w-36 max-w-[70%]" />
          <ChevronDownIcon
            className="text-muted-foreground size-4 shrink-0 opacity-50"
            aria-hidden
          />
        </div>
      </div>
      <Button
        aria-label="Supprimer la conversation"
        className="text-muted-foreground shrink-0"
        size="icon-sm"
        type="button"
        variant="ghost"
        disabled
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

/** Desktop sidebar — only title/date values skeleton. */
function DesktopListLoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="hidden space-y-1 p-2 lg:block" aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center">
          <div className="min-w-0 flex-1 rounded-lg px-2 py-2">
            <SkeletonDataValue heightClassName="h-4" widthClassName="w-[min(100%,9rem)]" />
            <div className="mt-1">
              <SkeletonDataValue heightClassName="h-3" widthClassName="w-16" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CoachConversationList({
  activeId,
  conversations,
  loading,
  newDisabled = false,
  onDelete,
  onNewConversation,
  onSelect,
}: {
  conversations: ClientConversationSummary[];
  activeId: string | null;
  loading: boolean;
  /** Desktop-only Lime Pulse pill above the list. */
  onNewConversation?: () => void;
  newDisabled?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const selectedId = activeId ?? conversations[0]?.id ?? '';
  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <aside
      aria-busy={loading || undefined}
      className="analysis-panel rounded-analysis-lg flex w-full shrink-0 flex-col gap-2 lg:h-full lg:w-[260px] lg:border-transparent lg:bg-transparent"
    >
      {onNewConversation ? (
        <Button
          className="hidden lg:inline-flex"
          disabled={newDisabled}
          type="button"
          variant="highlight"
          onClick={onNewConversation}
        >
          <MessageSquarePlus className="size-4" />
          Nouvelle conversation
        </Button>
      ) : null}

      {loading ? (
        <>
          <MobileSelectLoadingRow />
          <DesktopListLoadingRows />
        </>
      ) : null}

      {!loading && conversations.length === 0 ? (
        <p className="text-muted-foreground px-3 py-2 text-xs">
          Aucune conversation pour l&apos;instant.
        </p>
      ) : null}

      {!loading && conversations.length > 0 ? (
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
                  <SelectValue placeholder="Nouvelle conversation">
                    {selected ? conversationLabel(selected) : 'Nouvelle conversation'}
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
            {activeId ? (
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
            ) : null}
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
                        'rounded-analysis min-w-0 flex-1 border px-3 py-2.5 text-left text-sm transition-colors',
                        isActive
                          ? 'chip-surface'
                          : 'text-foreground/80 hover:bg-highlight/40 hover:text-foreground border-transparent',
                      )}
                      onClick={() => onSelect(c.id)}
                    >
                      <span className="block truncate font-medium">{conversationLabel(c)}</span>
                      <span className="text-data text-muted-foreground block truncate text-[10px]">
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
      ) : null}
    </aside>
  );
}
