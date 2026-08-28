'use client';

import {
  CoachConversationMobilePrimary,
  ConversationOverflowMenu,
  DesktopConversationList,
  DesktopListLoadingRows,
  MobileSelectLoadingRow,
  conversationLabel,
} from '@/components/coach/chat/coach-conversation-list-parts';
import type { ClientConversationSummary } from '@/lib/query/fetchers';

function ConversationListLoading({ isDraft, loading }: { isDraft: boolean; loading: boolean }) {
  return (
    <>
      {loading && !isDraft ? <MobileSelectLoadingRow /> : null}
      {loading ? <DesktopListLoadingRows /> : null}
    </>
  );
}

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

function ConversationListMobileSection({
  activeId,
  conversations,
  isDraft,
  selected,
  selectedId,
  mobileRenaming,
  onDelete,
  onRename,
  onSelect,
  onStartRename,
  onCancelRename,
}: {
  activeId: string | null;
  conversations: ClientConversationSummary[];
  isDraft: boolean;
  selected: ClientConversationSummary | undefined;
  selectedId: string;
  mobileRenaming: boolean;
  onDelete: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onSelect: (id: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
}) {
  const show = isDraft || conversations.length > 0;
  if (!show) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 p-2 lg:hidden">
      <div className="min-w-0 flex-1">
        <CoachConversationMobilePrimary
          activeId={activeId}
          conversations={conversations}
          isDraft={isDraft}
          mobileRenaming={mobileRenaming}
          selected={selected}
          selectedId={selectedId}
          onCancelRename={onCancelRename}
          onRename={onRename}
          onSelect={onSelect}
        />
      </div>
      {activeId && selected && !mobileRenaming ? (
        <ConversationOverflowMenu
          conversationId={activeId}
          label={conversationLabel(selected)}
          onDelete={() => onDelete(activeId)}
          onRename={onRename ? onStartRename : undefined}
        />
      ) : null}
    </div>
  );
}

export function CoachConversationListBody({
  activeId,
  conversations,
  isDraft,
  loading,
  selected,
  selectedId,
  mobileRenaming,
  onDelete,
  onRename,
  onSelect,
  onStartRename,
  onCancelRename,
}: {
  activeId: string | null;
  conversations: ClientConversationSummary[];
  isDraft: boolean;
  loading: boolean;
  selected: ClientConversationSummary | undefined;
  selectedId: string;
  mobileRenaming: boolean;
  onDelete: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onSelect: (id: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
}) {
  const showDesktopList = !loading && conversations.length > 0;
  const showEmptyHint = !loading && !isDraft && conversations.length === 0;

  return (
    <>
      <ConversationListLoading isDraft={isDraft} loading={loading} />
      <ConversationListEmptyHint show={showEmptyHint} />

      <ConversationListMobileSection
        activeId={activeId}
        conversations={conversations}
        isDraft={isDraft}
        mobileRenaming={mobileRenaming}
        selected={selected}
        selectedId={selectedId}
        onCancelRename={onCancelRename}
        onDelete={onDelete}
        onRename={onRename}
        onSelect={onSelect}
        onStartRename={onStartRename}
      />

      {showDesktopList ? (
        <DesktopConversationList
          activeId={activeId}
          conversations={conversations}
          onDelete={onDelete}
          onRename={onRename}
          onSelect={onSelect}
        />
      ) : null}
    </>
  );
}
