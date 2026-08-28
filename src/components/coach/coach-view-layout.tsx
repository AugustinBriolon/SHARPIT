'use client';

import { MessageSquarePlus } from 'lucide-react';
import type { ReactNode } from 'react';
import { CoachChatPanelShell } from '@/components/coach/chat/coach-chat-panel-shell';
import { CoachConversationList } from '@/components/coach/chat/coach-conversation-list';
import { CoachPageHeader } from '@/components/coach/coach-hub-skeleton';
import { Button } from '@/components/ui/button';
import type { ClientConversationSummary } from '@/lib/query/fetchers';

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

export function CoachViewLayout({
  conversations,
  conversationsLoading,
  selectedId,
  isEphemeral,
  newDisabled,
  viewportReady,
  isMobile,
  mountLiveChat,
  renderChat,
  onDelete,
  onNewConversation,
  onRename,
  onSelect,
  dialog,
}: CoachViewLayoutProps) {
  const conversationListEl = (
    <CoachConversationList
      activeDraft={isEphemeral}
      activeId={selectedId}
      conversations={conversations}
      loading={conversationsLoading}
      newDisabled={newDisabled}
      onDelete={onDelete}
      onNewConversation={onNewConversation}
      onRename={onRename}
      onSelect={onSelect}
    />
  );

  const mobileHeader = (
    <div className="flex flex-col gap-2 py-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-page-title truncate">Fil & conversations</h1>
        <Button
          aria-label="Nouvelle conversation"
          className="size-11"
          disabled={newDisabled}
          size="icon"
          variant="highlight"
          onClick={onNewConversation}
        >
          <MessageSquarePlus className="size-4.5" aria-hidden />
        </Button>
      </div>
      {conversationListEl}
    </div>
  );

  return (
    <div>
      <div
        className="bg-background safe-area-top fixed inset-x-0 top-0 z-30 flex flex-col lg:hidden"
        style={{ bottom: 'var(--bottom-nav-offset)' }}
      >
        {mountLiveChat && isMobile ? (
          renderChat(mobileHeader)
        ) : (
          <CoachChatPanelShell header={mobileHeader} />
        )}
      </div>
      <div className="hidden space-y-6 lg:block">
        <CoachPageHeader />
        <div className="flex h-[calc(100dvh-190px)] flex-col gap-3 lg:flex-row lg:gap-4">
          {conversationListEl}
          {mountLiveChat && !isMobile ? renderChat() : <CoachChatPanelShell />}
        </div>
      </div>
      {dialog}
    </div>
  );
}
