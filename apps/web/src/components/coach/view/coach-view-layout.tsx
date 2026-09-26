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
import type { ClientConversationSummary } from '@/client/query/fetchers';
import { cn } from '@sharpit/server/lib/utils';

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
        'bg-background fixed inset-x-0 top-0 z-30 flex flex-col',
        mobileFullBleed ? 'bottom-0' : 'bottom-(--bottom-nav-offset)',
      )}
    >
      {mountLiveChat ? renderChat(header) : <CoachChatPanelShell header={header} />}
    </div>
  );
}

function CoachViewOverlays({
  conversations,
  conversationsLoading,
  selectedId,
  isEphemeral,
  newDisabled,
  historyOpen,
  dialog,
  onDelete,
  onNewConversation,
  onRename,
  onSelect,
  onHistoryOpenChange,
}: Pick<
  CoachViewLayoutProps,
  | 'conversations'
  | 'conversationsLoading'
  | 'selectedId'
  | 'isEphemeral'
  | 'newDisabled'
  | 'dialog'
  | 'onDelete'
  | 'onNewConversation'
  | 'onRename'
  | 'onSelect'
> & { historyOpen: boolean; onHistoryOpenChange: (open: boolean) => void }) {
  return (
    <>
      <CoachHistoryDrawer
        conversations={conversations}
        conversationsLoading={conversationsLoading}
        isEphemeral={isEphemeral}
        newDisabled={newDisabled}
        open={historyOpen}
        selectedId={selectedId}
        onDelete={onDelete}
        onNewConversation={onNewConversation}
        onOpenChange={onHistoryOpenChange}
        onRename={onRename}
        onSelect={onSelect}
      />
      {dialog}
    </>
  );
}

export function CoachViewLayout(props: CoachViewLayoutProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const title = useMemo(
    () =>
      resolveThreadTitle({
        conversations: props.conversations,
        conversationsLoading: props.conversationsLoading,
        selectedId: props.selectedId,
        isEphemeral: props.isEphemeral,
      }),
    [props.conversations, props.conversationsLoading, props.selectedId, props.isEphemeral],
  );

  return (
    <>
      <CoachImmersiveFrame
        mobileFullBleed={props.isMobile}
        mountLiveChat={props.mountLiveChat}
        renderChat={props.renderChat}
        header={
          <CoachImmersiveHeader
            newDisabled={props.newDisabled}
            title={title}
            onNewConversation={props.onNewConversation}
            onOpenHistory={() => setHistoryOpen(true)}
          />
        }
      />
      <CoachViewOverlays
        {...props}
        historyOpen={historyOpen}
        onHistoryOpenChange={setHistoryOpen}
      />
    </>
  );
}
