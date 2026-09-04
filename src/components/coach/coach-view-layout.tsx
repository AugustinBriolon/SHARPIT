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

function CoachConversationListPanel({
  conversations,
  conversationsLoading,
  selectedId,
  isEphemeral,
  newDisabled,
  onDelete,
  onNewConversation,
  onRename,
  onSelect,
}: Pick<
  CoachViewLayoutProps,
  | 'conversations'
  | 'conversationsLoading'
  | 'selectedId'
  | 'isEphemeral'
  | 'newDisabled'
  | 'onDelete'
  | 'onNewConversation'
  | 'onRename'
  | 'onSelect'
>) {
  return (
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
}

function CoachMobileHeader({
  newDisabled,
  onNewConversation,
  conversationList,
}: {
  newDisabled: boolean;
  onNewConversation: () => void;
  conversationList: ReactNode;
}) {
  return (
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
      {conversationList}
    </div>
  );
}

function CoachMobileLayout({
  mountLiveChat,
  isMobile,
  renderChat,
  mobileHeader,
}: Pick<CoachViewLayoutProps, 'mountLiveChat' | 'isMobile' | 'renderChat'> & {
  mobileHeader: ReactNode;
}) {
  return (
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
  );
}

function CoachDesktopLayout({
  mountLiveChat,
  isMobile,
  renderChat,
  conversationList,
}: Pick<CoachViewLayoutProps, 'mountLiveChat' | 'isMobile' | 'renderChat'> & {
  conversationList: ReactNode;
}) {
  return (
    <div className="hidden space-y-6 lg:block">
      <CoachPageHeader />
      <div className="flex h-[calc(100dvh-190px-var(--bottom-nav-offset))] flex-col gap-3 lg:flex-row lg:gap-4">
        {conversationList}
        {mountLiveChat && !isMobile ? renderChat() : <CoachChatPanelShell />}
      </div>
    </div>
  );
}

function CoachViewLayoutFrame({
  mountLiveChat,
  isMobile,
  renderChat,
  conversationList,
  newDisabled,
  onNewConversation,
  dialog,
}: Pick<
  CoachViewLayoutProps,
  'mountLiveChat' | 'isMobile' | 'renderChat' | 'newDisabled' | 'onNewConversation' | 'dialog'
> & {
  conversationList: ReactNode;
}) {
  const mobileHeader = (
    <CoachMobileHeader
      conversationList={conversationList}
      newDisabled={newDisabled}
      onNewConversation={onNewConversation}
    />
  );

  return (
    <>
      <CoachMobileLayout
        isMobile={isMobile}
        mobileHeader={mobileHeader}
        mountLiveChat={mountLiveChat}
        renderChat={renderChat}
      />
      <CoachDesktopLayout
        conversationList={conversationList}
        isMobile={isMobile}
        mountLiveChat={mountLiveChat}
        renderChat={renderChat}
      />
      {dialog}
    </>
  );
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
  const conversationList = (
    <CoachConversationListPanel
      conversations={conversations}
      conversationsLoading={conversationsLoading}
      isEphemeral={isEphemeral}
      newDisabled={newDisabled}
      selectedId={selectedId}
      onDelete={onDelete}
      onNewConversation={onNewConversation}
      onRename={onRename}
      onSelect={onSelect}
    />
  );

  return (
    <div>
      <CoachViewLayoutFrame
        conversationList={conversationList}
        dialog={dialog}
        isMobile={isMobile}
        mountLiveChat={mountLiveChat}
        newDisabled={newDisabled}
        renderChat={renderChat}
        onNewConversation={onNewConversation}
      />
    </div>
  );
}
