'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { CoachChatPanelShell } from '@/components/coach/chat/shell/coach-chat-panel-shell';
import {
  CoachHistoryDrawer,
  CoachImmersiveHeader,
} from '@/components/coach/chat/shell/coach-immersive-chrome';
import {
  conversationListIsDraft,
  conversationListSelected,
  conversationListSelectedId,
} from '@/components/coach/chat/conversations/coach-conversation-list-helpers';
import type { ClientConversationSummary } from '@/lib/query/fetchers';
import { cn } from '@/lib/utils';

type CoachViewLayoutProps = {
  conversations: ClientConversationSummary[];
  conversationsLoading: boolean;
  selectedId: string | null;
  isEphemeral: boolean;
  newDisabled: boolean;
  viewportReady: boolean;
  isMobile: boolean;
  mountLiveChat: boolean;
  renderChat: (header?: ReactNode) => ReactNode;
  onDelete: (id: string) => void;
  onNewConversation: () => void;
  onRename: (id: string, title: string) => void;
  onSelect: (id: string) => void;
  dialog: ReactNode;
};

type ThreadTitleInput = Pick<
  CoachViewLayoutProps,
  'conversations' | 'conversationsLoading' | 'selectedId' | 'isEphemeral'
>;

function resolveThreadTitle(input: ThreadTitleInput): string {
  const isDraft = conversationListIsDraft(
    input.isEphemeral,
    input.conversationsLoading,
    input.selectedId,
    input.conversations,
  );
  if (isDraft) {
    return 'Nouvelle conversation';
  }
  const id = conversationListSelectedId(isDraft, input.selectedId, input.conversations);
  return (
    conversationListSelected(isDraft, input.conversations, id)?.title?.trim() || 'Conversation'
  );
}

function CoachImmersiveFrame({
  mountLiveChat,
  renderChat,
  header,
  mobileFullBleed,
}: {
  mountLiveChat: boolean;
  renderChat: (header?: ReactNode) => ReactNode;
  header: ReactNode;
  mobileFullBleed: boolean;
}) {
  return (
    <div
      className={cn(
        'bg-background safe-area-top fixed inset-x-0 top-0 z-30 flex flex-col',
        mobileFullBleed ? 'bottom-0' : 'bottom-(--bottom-nav-offset)',
      )}
    >
      {mountLiveChat ? renderChat(header) : <CoachChatPanelShell header={header} />}
    </div>
  );
}

function useCoachHistoryOpen() {
  const [historyOpen, setHistoryOpen] = useState(false);
  return { historyOpen, setHistoryOpen };
}

export function CoachViewLayout({
  conversations,
  conversationsLoading,
  selectedId,
  isEphemeral,
  newDisabled,
  viewportReady: _viewportReady,
  isMobile,
  mountLiveChat,
  renderChat,
  onDelete,
  onNewConversation,
  onRename,
  onSelect,
  dialog,
}: CoachViewLayoutProps) {
  const { historyOpen, setHistoryOpen } = useCoachHistoryOpen();
  const title = useMemo(
    () => resolveThreadTitle({ conversations, conversationsLoading, selectedId, isEphemeral }),
    [conversations, conversationsLoading, selectedId, isEphemeral],
  );
  const header = (
    <CoachImmersiveHeader
      newDisabled={newDisabled}
      title={title}
      onNewConversation={onNewConversation}
      onOpenHistory={() => setHistoryOpen(true)}
    />
  );

  return (
    <>
      <CoachImmersiveFrame
        header={header}
        mobileFullBleed={isMobile}
        mountLiveChat={mountLiveChat}
        renderChat={renderChat}
      />
      <CoachHistoryDrawer
        conversations={conversations}
        conversationsLoading={conversationsLoading}
        isEphemeral={isEphemeral}
        newDisabled={newDisabled}
        open={historyOpen}
        selectedId={selectedId}
        onDelete={onDelete}
        onNewConversation={onNewConversation}
        onOpenChange={setHistoryOpen}
        onRename={onRename}
        onSelect={onSelect}
      />
      {dialog}
    </>
  );
}
