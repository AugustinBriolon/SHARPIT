'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { History, MessageSquarePlus, X } from 'lucide-react';
import { Drawer } from '@base-ui/react/drawer';
import { CoachConversationList } from '@/components/coach/chat/conversations/coach-conversation-list';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
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

const SM_UP_QUERY = '(min-width: 640px)';

function subscribeSmUp(onChange: () => void) {
  const mq = window.matchMedia(SM_UP_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function useIsSmUp(): boolean {
  return useSyncExternalStore(
    subscribeSmUp,
    () => window.matchMedia(SM_UP_QUERY).matches,
    () => true,
  );
}

type HistoryBodyProps = {
  conversations: ClientConversationSummary[];
  conversationsLoading: boolean;
  selectedId: string | null;
  isEphemeral: boolean;
  newDisabled: boolean;
  onDelete: (id: string) => void;
  onNewConversation: () => void;
  onRename: (id: string, title: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
};

type HistorySurfaceProps = Omit<HistoryBodyProps, 'onClose'> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function CoachHistoryBody({
  conversations,
  conversationsLoading,
  selectedId,
  isEphemeral,
  newDisabled,
  onDelete,
  onNewConversation,
  onRename,
  onSelect,
  onClose,
}: HistoryBodyProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <CoachConversationList
        activeDraft={isEphemeral}
        activeId={selectedId}
        conversations={conversations}
        loading={conversationsLoading}
        newDisabled={newDisabled}
        variant="sheet"
        onDelete={onDelete}
        onRename={onRename}
        onNewConversation={() => {
          onNewConversation();
          onClose();
        }}
        onSelect={(id) => {
          onSelect(id);
          onClose();
        }}
      />
    </div>
  );
}

function HistorySheetHeader({
  titleAs,
  close,
}: {
  titleAs: 'drawer' | 'dialog';
  close: ReactNode;
}) {
  const Title = titleAs === 'drawer' ? Drawer.Title : DialogTitle;
  return (
    <div className="mb-2 flex items-center justify-between gap-3 px-1 pt-0.5">
      <Title className="text-foreground text-[15px] font-medium tracking-tight">
        Conversations
      </Title>
      {close}
    </div>
  );
}

function CoachHistoryMobileDrawer(props: HistorySurfaceProps) {
  const { open, onOpenChange, ...body } = props;
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Backdrop
          className={cn(
            'bg-background/60 fixed inset-0 z-61 backdrop-blur-sm',
            'transition-opacity duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
            'data-ending-style:opacity-0 data-starting-style:opacity-0',
            'motion-reduce:transition-none',
          )}
        />
        <Drawer.Viewport className="fixed inset-0 z-61 flex flex-col justify-end">
          <Drawer.Popup
            className={cn(
              'bg-popover border-border flex max-h-[80dvh] w-full flex-col rounded-t-[20px] border-t p-3 shadow-lg outline-none',
              // Base UI + Tailwind v4: animate `transform` (not `translate-*`).
              '[transform:translate3d(0,var(--drawer-swipe-movement-y,0px),0)]',
              'transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
              'data-starting-style:[transform:translate3d(0,100%,0)]',
              'data-ending-style:[transform:translate3d(0,100%,0)]',
              'motion-reduce:transition-none',
            )}
          >
            <HistorySheetHeader
              titleAs="drawer"
              close={
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
              }
            />
            <CoachHistoryBody {...body} onClose={() => onOpenChange(false)} />
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function CoachHistoryDesktopDialog(props: HistorySurfaceProps) {
  const { open, onOpenChange, ...body } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'bg-popover flex max-h-[min(80dvh,36rem)] w-full max-w-md flex-col gap-0 p-3',
          'rounded-[20px] sm:max-w-md',
        )}
      >
        <HistorySheetHeader
          titleAs="dialog"
          close={
            <DialogClose
              aria-label="Fermer"
              className={cn(
                'text-muted-foreground hover:bg-muted hover:text-foreground',
                'inline-flex size-8 items-center justify-center rounded-full',
                'transition-[background-color,color,transform] duration-150',
                'active:scale-[0.94]',
              )}
            >
              <X className="size-4" strokeWidth={1.8} aria-hidden />
            </DialogClose>
          }
        />
        <CoachHistoryBody {...body} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * History — bottom sheet on phone, centered modal on sm+.
 * Split primitives avoid Drawer swipe/transform fighting modal enter animations.
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
  const isSmUp = useIsSmUp();
  const shared = {
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
  };

  if (isSmUp) {
    return <CoachHistoryDesktopDialog {...shared} />;
  }
  return <CoachHistoryMobileDrawer {...shared} />;
}
