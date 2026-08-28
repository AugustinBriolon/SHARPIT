import type { UIMessage } from 'ai';
import type { ReactNode } from 'react';
import { CoachChat } from '@/components/coach/chat/coach-chat';
import { CoachChatPanelShell } from '@/components/coach/chat/coach-chat-panel-shell';
import { OfflineSnapshotSummary } from '@/components/pwa/offline-snapshot-summary';
import type { CoachDiscussContext } from '@/lib/coach/chat/coach-discuss-context';
import type { PersistedSnapshotEntry } from '@/lib/pwa/snapshot-store-validation';

type CoachChatPaneProps = {
  selectedId: string;
  latchedContext: CoachDiscussContext | null;
  autoReply: boolean;
  initialMessages: UIMessage[];
  isEphemeral: boolean;
  header?: ReactNode;
  onAutoReplyStarted: () => void;
  onDetachContext: () => void;
  onConversationCreated: (id: string) => void;
};

function CoachChatPane({
  selectedId,
  latchedContext,
  autoReply,
  initialMessages,
  isEphemeral,
  header,
  onAutoReplyStarted,
  onDetachContext,
  onConversationCreated,
}: CoachChatPaneProps) {
  return (
    <CoachChat
      key={selectedId}
      attachedContext={latchedContext}
      autoReply={autoReply}
      conversationId={selectedId}
      header={header}
      initialMessages={initialMessages}
      isEphemeral={isEphemeral}
      onAutoReplyStarted={onAutoReplyStarted}
      onConversationCreated={onConversationCreated}
      onDetachContext={onDetachContext}
    />
  );
}

type RenderCoachChatOptions = {
  online: boolean;
  hasNoLiveContent: boolean;
  offlineEntry: PersistedSnapshotEntry | null;
  selectedId: string | null;
  isEphemeral: boolean;
  latchedContext: CoachDiscussContext | null;
  autoReplyId: string | null;
  activeConversationPending: boolean;
  activeConversationLoading: boolean;
  activeConversationData: { messages: unknown[] } | null | undefined;
  header?: ReactNode;
  onAutoReplyStarted: () => void;
  onDetachContext: () => void;
  onConversationCreated: (id: string) => void;
};

function OfflineCoachChat({
  header,
  offlineEntry,
}: {
  header?: ReactNode;
  offlineEntry: PersistedSnapshotEntry;
}) {
  return (
    <>
      {header}
      <OfflineSnapshotSummary entry={offlineEntry} />
    </>
  );
}

function renderActiveCoachChat(options: RenderCoachChatOptions & { selectedId: string }) {
  const {
    selectedId,
    isEphemeral,
    latchedContext,
    autoReplyId,
    activeConversationPending,
    activeConversationLoading,
    activeConversationData,
    header,
    onAutoReplyStarted,
    onDetachContext,
    onConversationCreated,
  } = options;

  if (isEphemeral) {
    return (
      <CoachChatPane
        autoReply={autoReplyId === selectedId}
        header={header}
        initialMessages={[]}
        latchedContext={latchedContext}
        selectedId={selectedId}
        isEphemeral
        onAutoReplyStarted={onAutoReplyStarted}
        onConversationCreated={onConversationCreated}
        onDetachContext={onDetachContext}
      />
    );
  }

  if (activeConversationPending || activeConversationLoading || !activeConversationData) {
    return <CoachChatPanelShell header={header} />;
  }

  return (
    <CoachChatPane
      autoReply={autoReplyId === selectedId}
      header={header}
      initialMessages={activeConversationData.messages as UIMessage[]}
      isEphemeral={false}
      latchedContext={latchedContext}
      selectedId={selectedId}
      onAutoReplyStarted={onAutoReplyStarted}
      onConversationCreated={onConversationCreated}
      onDetachContext={onDetachContext}
    />
  );
}

export function renderCoachChat(options: RenderCoachChatOptions) {
  const { header, offlineEntry, selectedId } = options;
  if (!options.online && options.hasNoLiveContent && offlineEntry) {
    return <OfflineCoachChat header={header} offlineEntry={offlineEntry} />;
  }

  if (!selectedId) {
    return <CoachChatPanelShell header={header} />;
  }

  return renderActiveCoachChat({ ...options, selectedId });
}
