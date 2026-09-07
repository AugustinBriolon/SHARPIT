'use client';

import { MessageSquarePlus } from 'lucide-react';
import { CoachConversationListBody } from '@/components/coach/chat/coach-conversation-list-body';
import {
  conversationListIsDraft,
  conversationListSelected,
  conversationListSelectedId,
} from '@/components/coach/chat/coach-conversation-list-helpers';
import type { ClientConversationSummary } from '@/lib/query/fetchers';
import { cn } from '@/lib/utils';

export function CoachConversationList({
  activeId,
  activeDraft = false,
  conversations,
  loading,
  newDisabled = false,
  variant = 'panel',
  onDelete,
  onNewConversation,
  onRename,
  onSelect,
}: {
  conversations: ClientConversationSummary[];
  activeId: string | null;
  activeDraft?: boolean;
  loading: boolean;
  onNewConversation?: () => void;
  newDisabled?: boolean;
  /** `sheet` = history drawer (no nested analysis panel). */
  variant?: 'panel' | 'sheet';
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, title: string) => void;
}) {
  const isDraft = conversationListIsDraft(activeDraft, loading, activeId, conversations);
  const selectedId = conversationListSelectedId(isDraft, activeId, conversations);
  const selected = conversationListSelected(isDraft, conversations, selectedId);
  const isSheet = variant === 'sheet';

  return (
    <aside
      aria-busy={loading || undefined}
      className={cn(
        'flex w-full shrink-0 flex-col gap-2',
        !isSheet && 'analysis-panel rounded-analysis-lg',
      )}
    >
      {onNewConversation ? (
        <button
          disabled={newDisabled}
          type="button"
          className={cn(
            'bg-foreground text-background inline-flex w-full items-center justify-center gap-2',
            'rounded-full px-3 py-2.5 text-[13px] font-medium',
            'transition-[opacity,transform] duration-150 ease-out',
            'enabled:active:scale-[0.98] disabled:opacity-40',
          )}
          onClick={onNewConversation}
        >
          <MessageSquarePlus className="size-4" strokeWidth={1.8} aria-hidden />
          Nouvelle conversation
        </button>
      ) : null}

      <CoachConversationListBody
        activeId={activeId}
        conversations={conversations}
        isDraft={isDraft}
        loading={loading}
        mobileRenaming={false}
        selected={selected}
        selectedId={selectedId}
        variant={variant}
        onCancelRename={() => undefined}
        onDelete={onDelete}
        onRename={onRename}
        onSelect={onSelect}
        onStartRename={() => undefined}
      />
    </aside>
  );
}
