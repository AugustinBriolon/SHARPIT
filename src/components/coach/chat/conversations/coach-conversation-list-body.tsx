'use client';

import {
  ConversationOverflowMenu,
  DesktopConversationList,
  DesktopListLoadingRows,
  conversationLabel,
} from '@/components/coach/chat/conversations/coach-conversation-list-parts';
import type { ClientConversationSummary } from '@/lib/query/fetchers';

function ConversationListEmptyHint({ show }: { show: boolean }) {
  if (!show) {
    return null;
  }
  return (
    <p className="text-muted-foreground px-3 py-2 text-xs leading-relaxed">
      Aucune conversation. Démarre une discussion pour obtenir un conseil contextualisé.
    </p>
  );
}

export function CoachConversationListBody({
  activeId,
  conversations,
  isDraft,
  loading,
  variant = 'panel',
  onDelete,
  onRename,
  onSelect,
}: {
  activeId: string | null;
  conversations: ClientConversationSummary[];
  isDraft: boolean;
  loading: boolean;
  selected: ClientConversationSummary | undefined;
  selectedId: string;
  mobileRenaming: boolean;
  variant?: 'panel' | 'sheet';
  onDelete: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onSelect: (id: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
}) {
  const showList = !loading && conversations.length > 0;
  const showEmptyHint = !loading && !isDraft && conversations.length === 0;

  return (
    <>
      {loading ? <DesktopListLoadingRows /> : null}
      <ConversationListEmptyHint show={showEmptyHint} />

      {showList ? (
        <DesktopConversationList
          activeId={activeId}
          conversations={conversations}
          variant={variant}
          onDelete={onDelete}
          onRename={onRename}
          onSelect={onSelect}
        />
      ) : null}
    </>
  );
}

/** Kept for overflow menu tests / callers that still import the label helper. */
export { ConversationOverflowMenu, conversationLabel };
