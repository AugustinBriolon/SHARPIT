'use client';

import { History, MessageSquarePlus, X } from 'lucide-react';
import { Drawer } from '@base-ui/react/drawer';
import { CoachConversationList } from '@/components/coach/chat/coach-conversation-list';
import type { ClientConversationSummary } from '@/lib/query/fetchers';
import { cn } from '@/lib/utils';

/**
 * Minimal Chat header — thread title + history + new (Beautiful UI Chat chrome).
 */
export function CoachImmersiveHeader({
  title,
  newDisabled,
  onOpenHistory,
  onNewConversation,
}: {
  title: string;
  newDisabled: boolean;
  onOpenHistory: () => void;
  onNewConversation: () => void;
}) {
  return (
    <div className="border-border/50 flex items-center gap-1 border-b py-1.5">
      <h1 className="text-foreground min-w-0 flex-1 truncate px-0.5 text-[15px] font-medium tracking-tight">
        {title}
      </h1>
      <button
        aria-label="Historique des conversations"
        type="button"
        className={cn(
          'text-muted-foreground hover:bg-muted hover:text-foreground',
          'inline-flex size-9 shrink-0 items-center justify-center rounded-full',
          'transition-[background-color,color,transform] duration-150 ease-out',
          'active:scale-[0.94]',
        )}
        onClick={onOpenHistory}
      >
        <History className="size-4" strokeWidth={1.8} aria-hidden />
      </button>
      <button
        aria-label="Nouvelle conversation"
        disabled={newDisabled}
        type="button"
        className={cn(
          'bg-foreground text-background inline-flex size-9 shrink-0 items-center justify-center rounded-full',
          'transition-[opacity,transform] duration-150 ease-out',
          'enabled:active:scale-[0.94] disabled:opacity-40',
        )}
        onClick={onNewConversation}
      >
        <MessageSquarePlus className="size-4" strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  );
}

/**
 * History sheet — Beautiful UI Sidebar Nav pattern as a bottom/center drawer,
 * not a second app nav. Gliding list lives in CoachConversationList (sheet).
 */
export function CoachHistoryDrawer({
  open,
  onOpenChange,
  conversations,
  conversationsLoading,
  selectedId,
  isEphemeral,
  newDisabled,
  onDelete,
  onNewConversation,
  onRename,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: ClientConversationSummary[];
  conversationsLoading: boolean;
  selectedId: string | null;
  isEphemeral: boolean;
  newDisabled: boolean;
  onDelete: (id: string) => void;
  onNewConversation: () => void;
  onRename: (id: string, title: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      {/*
        Same contract as `ui/dialog`: keepMounted + tw-animate data-open/closed.
        Tailwind v4 `translate-*` uses the `translate` property, which is NOT
        covered by `transition-transform` — so CSS open/close looked instant.
      */}
      <Drawer.Portal keepMounted>
        <Drawer.Backdrop
          className={cn(
            'bg-background/60 fixed inset-0 z-61 backdrop-blur-sm',
            'data-open:animate-in data-open:fade-in-0',
            'data-closed:animate-out data-closed:fade-out-0',
            'duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
            'motion-reduce:animate-none',
          )}
        />
        <Drawer.Viewport className="fixed inset-0 z-61 flex flex-col justify-end sm:justify-center sm:p-6">
          <Drawer.Popup
            className={cn(
              'bg-popover border-border flex w-full flex-col shadow-lg outline-none',
              'max-h-[80dvh] rounded-t-[20px] border-t p-3',
              'sm:mx-auto sm:max-w-md sm:rounded-[20px] sm:border',
              'data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom',
              'sm:data-open:zoom-in-[0.98] sm:data-closed:zoom-out-[0.98]',
              'duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
              'motion-reduce:animate-none',
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-3 px-1 pt-0.5">
              <Drawer.Title className="text-foreground text-[15px] font-medium tracking-tight">
                Conversations
              </Drawer.Title>
              <Drawer.Close
                aria-label="Fermer"
                className={cn(
                  'text-muted-foreground hover:bg-muted hover:text-foreground',
                  'inline-flex size-8 items-center justify-center rounded-full',
                  'transition-[background-color,color,transform] duration-150',
                  'active:scale-[0.94]',
                )}
              >
                <X className="size-4" strokeWidth={1.8} aria-hidden />
              </Drawer.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <CoachConversationList
                activeDraft={isEphemeral}
                activeId={selectedId}
                conversations={conversations}
                loading={conversationsLoading}
                newDisabled={newDisabled}
                variant="sheet"
                onRename={onRename}
                onDelete={(id) => {
                  onDelete(id);
                }}
                onNewConversation={() => {
                  onNewConversation();
                  onOpenChange(false);
                }}
                onSelect={(id) => {
                  onSelect(id);
                  onOpenChange(false);
                }}
              />
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
