'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, MessageSquarePlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

function InlineRenameInput({
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
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onCancel();
      }}
    />
  );
}

/** Mobile Select chrome — only the label text skeletons while conversations load. */
function MobileSelectLoadingRow() {
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

const mobileSelectTriggerClassName = cn(
  'border-input flex min-h-11 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border',
  'bg-transparent py-2 pr-2 pl-2.5 text-sm lg:min-h-9',
);

/** Draft landing — label is known before the conversations query resolves. */
function MobileDraftConversationRow() {
  return (
    <div aria-label="Conversation active" className={mobileSelectTriggerClassName}>
      <span className="truncate">Nouvelle conversation</span>
      <ChevronDownIcon className="text-muted-foreground size-4 shrink-0 opacity-50" aria-hidden />
    </div>
  );
}

/** Desktop sidebar — only title/date values skeleton. */
function DesktopListLoadingRows({ rows = 4 }: { rows?: number }) {
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

/** Overflow menu — rename + delete in a single, discoverable trigger. */
function ConversationOverflowMenu({
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

function DesktopConversationList({
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
                  if (onRename) setEditingId(c.id);
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

export function CoachConversationList({
  activeId,
  activeDraft = false,
  conversations,
  loading,
  newDisabled = false,
  onDelete,
  onNewConversation,
  onRename,
  onSelect,
}: {
  conversations: ClientConversationSummary[];
  activeId: string | null;
  /** Ephemeral draft — label is known; never skeleton the mobile picker for this. */
  activeDraft?: boolean;
  loading: boolean;
  onNewConversation?: () => void;
  newDisabled?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, title: string) => void;
}) {
  const isDraft =
    activeDraft || (!loading && Boolean(activeId && !conversations.some((c) => c.id === activeId)));
  const awaitingMobileList = loading && !isDraft;
  const awaitingDesktopList = loading;
  const selectedId = isDraft ? '' : (activeId ?? conversations[0]?.id ?? '');
  const selected = isDraft ? undefined : conversations.find((c) => c.id === selectedId);
  const [mobileRenaming, setMobileRenaming] = useState(false);
  const showMobilePicker = isDraft || conversations.length > 0;
  const showDesktopList = !awaitingDesktopList && conversations.length > 0;

  function renderMobilePrimary() {
    if (mobileRenaming && activeId && selected) {
      return (
        <InlineRenameInput
          initial={conversationLabel(selected)}
          onCancel={() => setMobileRenaming(false)}
          onCommit={(title) => {
            onRename?.(activeId, title);
            setMobileRenaming(false);
          }}
        />
      );
    }

    if (isDraft) {
      if (conversations.length === 0) return <MobileDraftConversationRow />;
      return (
        <Select
          value="__draft__"
          onValueChange={(value) => {
            if (value && value !== '__draft__') onSelect(value);
          }}
        >
          <SelectTrigger
            aria-label="Conversation active"
            className="min-h-11 w-full min-w-0 lg:h-9"
          >
            <SelectValue>Nouvelle conversation</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-64 w-(--anchor-width) max-w-(--anchor-width)">
            <SelectItem className="min-w-0" value="__draft__">
              Nouvelle conversation
            </SelectItem>
            {conversations.map((c) => (
              <SelectItem key={c.id} className="min-w-0" value={c.id}>
                <span className="block min-w-0 truncate">{conversationLabel(c)}</span>
                <span className="text-muted-foreground block min-w-0 truncate text-xs">
                  {formatDistanceToNow(c.updatedAt, { addSuffix: true, locale: fr })}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Select
        value={selectedId}
        onValueChange={(value) => {
          if (value) onSelect(value);
        }}
      >
        <SelectTrigger aria-label="Conversation active" className="min-h-11 w-full min-w-0 lg:h-9">
          <SelectValue placeholder="Nouvelle conversation">
            {selected ? conversationLabel(selected) : 'Nouvelle conversation'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-64 w-(--anchor-width) max-w-(--anchor-width)">
          {conversations.map((c) => (
            <SelectItem key={c.id} className="min-w-0" value={c.id}>
              <span className="block min-w-0 truncate">{conversationLabel(c)}</span>
              <span className="text-muted-foreground block min-w-0 truncate text-xs">
                {formatDistanceToNow(c.updatedAt, { addSuffix: true, locale: fr })}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <aside
      aria-busy={loading || undefined}
      className="analysis-panel rounded-analysis-lg flex w-full shrink-0 flex-col gap-2 lg:h-full lg:w-65 lg:border-transparent lg:bg-transparent"
    >
      {onNewConversation ? (
        <Button
          className="hidden lg:inline-flex"
          disabled={newDisabled}
          type="button"
          variant="highlight"
          onClick={onNewConversation}
        >
          <MessageSquarePlus className="size-4" aria-hidden />
          Nouvelle conversation
        </Button>
      ) : null}

      {awaitingMobileList ? <MobileSelectLoadingRow /> : null}
      {awaitingDesktopList ? <DesktopListLoadingRows /> : null}

      {!loading && !isDraft && conversations.length === 0 ? (
        <p className="text-muted-foreground px-3 py-2 text-xs leading-relaxed">
          Aucune conversation. Démarre une discussion pour obtenir un conseil contextualisé.
        </p>
      ) : null}

      {showMobilePicker ? (
        <div className="flex items-center gap-1.5 p-2 lg:hidden">
          <div className="min-w-0 flex-1">{renderMobilePrimary()}</div>
          {activeId && selected ? (
            <ConversationOverflowMenu
              conversationId={activeId}
              label={conversationLabel(selected)}
              onDelete={() => onDelete(activeId)}
              onRename={onRename ? () => setMobileRenaming(true) : undefined}
            />
          ) : null}
        </div>
      ) : null}

      {showDesktopList ? (
        <DesktopConversationList
          activeId={activeId}
          conversations={conversations}
          onDelete={onDelete}
          onRename={onRename}
          onSelect={onSelect}
        />
      ) : null}
    </aside>
  );
}
