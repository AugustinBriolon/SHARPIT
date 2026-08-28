'use client';

import { MessageSquarePlus } from 'lucide-react';
import { useState } from 'react';
import { CoachConversationListBody } from '@/components/coach/chat/coach-conversation-list-body';
import {
  conversationListIsDraft,
  conversationListSelected,
  conversationListSelectedId,
} from '@/components/coach/chat/coach-conversation-list-helpers';
import { Button } from '@/components/ui/button';
import type { ClientConversationSummary } from '@/lib/query/fetchers';

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
  activeDraft?: boolean;
  loading: boolean;
  onNewConversation?: () => void;
  newDisabled?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, title: string) => void;
}) {
  const isDraft = conversationListIsDraft(activeDraft, loading, activeId, conversations);
  const selectedId = conversationListSelectedId(isDraft, activeId, conversations);
  const selected = conversationListSelected(isDraft, conversations, selectedId);
  const [mobileRenaming, setMobileRenaming] = useState(false);

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

      <CoachConversationListBody
        activeId={activeId}
        conversations={conversations}
        isDraft={isDraft}
        loading={loading}
        mobileRenaming={mobileRenaming}
        selected={selected}
        selectedId={selectedId}
        onCancelRename={() => setMobileRenaming(false)}
        onDelete={onDelete}
        onRename={onRename}
        onSelect={onSelect}
        onStartRename={() => setMobileRenaming(true)}
      />
    </aside>
  );
}
