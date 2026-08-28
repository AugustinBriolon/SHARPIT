'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronDownIcon, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { cn } from '@/lib/utils';
import type { ClientConversationSummary } from '@/lib/query/fetchers';
import {
  CoachConversationMobilePicker,
  conversationLabel,
} from '@/components/coach/chat/coach-conversation-mobile-picker';

export { conversationLabel };

export function InlineRenameInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial);

  useEffect(() => {
    ref.current?.select();
  }, []);

  function commit() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== initial) {
      onCommit(trimmed);
    } else {
      onCancel();
    }
  }

  return (
    <input
      ref={ref}
      className="bg-background ring-primary/40 focus-visible:ring-ring w-full rounded px-1 py-0.5 text-sm font-medium ring-1 outline-none focus-visible:ring-2"
      maxLength={60}
      value={value}
      onBlur={commit}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit();
        }
        if (e.key === 'Escape') {
          onCancel();
        }
      }}
    />
  );
}

export function MobileSelectLoadingRow() {
  return (
    <div className="flex items-center gap-1.5 p-2 lg:hidden" aria-busy>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'border-input flex min-h-11 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border',
            'bg-transparent py-2 pr-2 pl-2.5 text-sm lg:min-h-9',
          )}
        >
          <SkeletonDataValue heightClassName="h-3.5" widthClassName="w-36 max-w-[70%]" />
          <ChevronDownIcon
            className="text-muted-foreground size-4 shrink-0 opacity-50"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}

export function DesktopListLoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="hidden space-y-1 p-2 lg:block" aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center">
          <div className="rounded-analysis min-w-0 flex-1 border border-transparent px-3 py-2.5">
            <SkeletonDataValue heightClassName="h-4" widthClassName="w-[min(100%,9rem)]" />
            <div className="mt-1">
              <SkeletonDataValue heightClassName="h-2.5" widthClassName="w-16" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ConversationOverflowMenu({
  conversationId: _conversationId,
  label,
  onRename,
  onDelete,
}: {
  conversationId: string;
  label: string;
  onRename?: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Actions pour ${label}`}
            className="text-muted-foreground size-7"
            size="icon-xs"
            type="button"
            variant="ghost"
          />
        }
      >
        <MoreHorizontal className="size-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {onRename ? (
          <DropdownMenuItem className="cursor-pointer gap-2" onClick={onRename}>
            <Pencil className="size-3.5" aria-hidden />
            Renommer
          </DropdownMenuItem>
        ) : null}
        {onRename ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem className="cursor-pointer gap-2" variant="destructive" onClick={onDelete}>
          <Trash2 className="size-3.5" aria-hidden />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DesktopConversationList({
  activeId,
  conversations,
  onDelete,
  onRename,
  onSelect,
}: {
  activeId: string | null;
  conversations: ClientConversationSummary[];
  onDelete: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onSelect: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="hidden max-h-[60vh] flex-1 overflow-y-auto overscroll-x-contain p-2 lg:block lg:max-h-none">
      <ul aria-label="Conversations" className="space-y-1">
        {conversations.map((c) => {
          const isActive = c.id === activeId;
          const isEditing = editingId === c.id;

          return (
            <li key={c.id} className="cv-auto group relative flex items-center">
              <button
                aria-current={isActive ? 'page' : undefined}
                type="button"
                className={cn(
                  'rounded-analysis pressable min-w-0 flex-1 border px-3 py-2.5 text-left text-sm',
                  isActive
                    ? 'chip-surface'
                    : 'text-foreground/80 hover:bg-highlight/40 hover:text-foreground border-transparent',
                )}
                onClick={() => onSelect(c.id)}
                onDoubleClick={() => {
                  if (onRename) {
                    setEditingId(c.id);
                  }
                }}
              >
                {isEditing ? (
                  <InlineRenameInput
                    initial={conversationLabel(c)}
                    onCancel={() => setEditingId(null)}
                    onCommit={(title) => {
                      onRename?.(c.id, title);
                      setEditingId(null);
                    }}
                  />
                ) : (
                  <span className="block truncate pr-6 font-medium">{conversationLabel(c)}</span>
                )}
                <span className="text-data text-muted-foreground block truncate text-xs">
                  {formatDistanceToNow(c.updatedAt, { addSuffix: true, locale: fr })}
                </span>
              </button>
              {!isEditing ? (
                <div className="absolute top-1/2 right-2 -translate-y-1/2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  <ConversationOverflowMenu
                    conversationId={c.id}
                    label={conversationLabel(c)}
                    onDelete={() => onDelete(c.id)}
                    onRename={onRename ? () => setEditingId(c.id) : undefined}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CoachConversationMobilePrimary({
  isDraft,
  conversations,
  selected,
  selectedId,
  activeId,
  mobileRenaming,
  onSelect,
  onRename,
  onCancelRename,
}: {
  isDraft: boolean;
  conversations: ClientConversationSummary[];
  selected: ClientConversationSummary | undefined;
  selectedId: string;
  activeId: string | null;
  mobileRenaming: boolean;
  onSelect: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onCancelRename: () => void;
}) {
  if (mobileRenaming && activeId && selected) {
    return (
      <InlineRenameInput
        initial={conversationLabel(selected)}
        onCancel={onCancelRename}
        onCommit={(title) => {
          onRename?.(activeId, title);
          onCancelRename();
        }}
      />
    );
  }

  return (
    <CoachConversationMobilePicker
      conversations={conversations}
      isDraft={isDraft}
      selected={selected}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}
