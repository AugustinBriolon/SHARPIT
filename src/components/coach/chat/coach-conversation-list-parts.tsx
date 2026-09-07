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
      className="bg-background ring-primary/40 focus-visible:ring-ring w-full rounded-md px-1 py-0.5 text-sm font-medium ring-1 outline-none focus-visible:ring-2"
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
    <ul className="space-y-1 p-2" aria-busy>
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
  variant = 'panel',
  onDelete,
  onRename,
  onSelect,
}: {
  activeId: string | null;
  conversations: ClientConversationSummary[];
  variant?: 'panel' | 'sheet';
  onDelete: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onSelect: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [rowBox, setRowBox] = useState<{ top: number; height: number } | null>(null);
  const isSheet = variant === 'sheet';
  const highlightId = hoveredId ?? activeId;

  useEffect(() => {
    if (!highlightId) {
      setRowBox(null);
      return;
    }
    const index = conversations.findIndex((c) => c.id === highlightId);
    const target = rowRefs.current[index];
    if (target) {
      setRowBox({ top: target.offsetTop, height: target.offsetHeight });
    }
  }, [highlightId, conversations, editingId]);

  return (
    <div
      className={cn(
        'relative max-h-[min(60vh,28rem)] flex-1 overflow-y-auto overscroll-x-contain',
        isSheet ? 'px-0.5 py-1' : 'p-2',
      )}
      onMouseLeave={() => setHoveredId(null)}
    >
      {/* Beautiful UI Sidebar Nav — single gliding highlight */}
      {isSheet && rowBox ? (
        <span
          className="bg-muted pointer-events-none absolute inset-x-0.5 rounded-[10px]"
          style={{
            top: rowBox.top,
            height: rowBox.height,
            opacity: highlightId ? 1 : 0,
            transition:
              'top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease',
          }}
          aria-hidden
        />
      ) : null}

      <ul aria-label="Conversations" className="relative space-y-0.5">
        {conversations.map((c, index) => {
          const isActive = c.id === activeId;
          const isEditing = editingId === c.id;

          return (
            <li
              key={c.id}
              ref={(el) => {
                rowRefs.current[index] = el;
              }}
              className="cv-auto group relative flex items-center"
            >
              <button
                aria-current={isActive ? 'page' : undefined}
                type="button"
                className={cn(
                  'relative z-10 min-w-0 flex-1 px-3 py-2.5 text-left text-sm outline-none',
                  isSheet
                    ? cn(
                        'rounded-[10px] border border-transparent',
                        isActive ? 'text-foreground font-medium' : 'text-foreground/85',
                      )
                    : cn(
                        'rounded-analysis pressable border',
                        isActive
                          ? 'chip-surface'
                          : 'text-foreground/80 hover:bg-highlight/40 hover:text-foreground border-transparent',
                      ),
                )}
                onClick={() => onSelect(c.id)}
                onMouseEnter={() => setHoveredId(c.id)}
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
                <div className="absolute top-1/2 right-2 z-20 -translate-y-1/2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
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
