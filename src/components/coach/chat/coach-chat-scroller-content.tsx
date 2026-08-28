'use client';

import { Message, MessageBubble, MessageBubbleContent } from '@/components/agents/message';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import { CoachBeuiLoadingStatus } from '@/components/coach/beui/coach-beui-loading';
import { showSubmittedPlaceholder } from '@/components/coach/beui/coach-message-mapper';
import { coachBeuiTheme } from '@/components/coach/beui/coach-beui-theme';
import { CoachToolApprovalCard } from '@/components/coach/beui/coach-tool-approval-card';
import { CoachChatEmptyState } from '@/components/coach/chat/coach-chat-empty-state';
import { CoachChatTranscriptRows } from '@/components/coach/chat/coach-chat-transcript';
import { Button } from '@/components/ui/button';
import type { useCoachChat } from './use-coach-chat';

type CoachChatState = ReturnType<typeof useCoachChat>;

export function CoachChatScrollerContent({
  chat,
  header,
}: {
  chat: CoachChatState;
  header?: React.ReactNode;
}) {
  return (
    <>
      {header ? (
        <div className="bg-background fixed top-0 right-0 left-0 z-10 px-3 py-2">{header}</div>
      ) : null}

      {chat.messages.length === 0 ? (
        <CoachChatEmptyState
          disabled={chat.inputLocked}
          onSuggestionClick={(text) => void chat.submit(text)}
        />
      ) : null}

      <CoachChatTranscriptRows
        lastAssistantRowKey={chat.lastAssistantRowKey}
        mappedRows={chat.mappedRows}
        streamIdle={chat.streamIdle}
      />

      {showSubmittedPlaceholder(chat.status, chat.messages) ? (
        <Message from="assistant">
          <MessageBubble variant="ghost">
            <MessageBubbleContent className={coachBeuiTheme.typingBubble}>
              <CoachBeuiLoadingStatus />
            </MessageBubbleContent>
          </MessageBubble>
        </Message>
      ) : null}

      <CoachChatApprovals chat={chat} />

      {chat.error ? (
        <div
          className="bg-destructive/10 text-destructive space-y-2 rounded-md p-3 text-sm"
          role="alert"
        >
          <p>{chat.errorMessage}</p>
          <Button type="button" variant="outline" onClick={chat.clearChatError}>
            {coachBeuiCopy.retryLater}
          </Button>
        </div>
      ) : null}
    </>
  );
}

function CoachChatApprovals({ chat }: { chat: CoachChatState }) {
  if (chat.pendingApprovals.length === 0) {
    return null;
  }

  return (
    <div
      aria-label={coachBeuiCopy.approvalsRegionLabel}
      className={coachBeuiTheme.approvalsRegion}
      role="region"
    >
      <p className={coachBeuiTheme.approvalsHeading}>
        <span className={coachBeuiTheme.approvalsBadge}>{chat.pendingApprovals.length}</span>
        {chat.pendingApprovals.length === 1
          ? coachBeuiCopy.pendingApprovalOne
          : coachBeuiCopy.pendingApprovalMany}
      </p>
      {chat.pendingApprovals.map((part, i) => (
        <CoachToolApprovalCard
          key={part.approval?.id ?? `${part.type}:${i}`}
          disabled={chat.guardDisabled}
          knownSessions={chat.knownSessions}
          part={part}
          onApproval={chat.handleApproval}
        />
      ))}
    </div>
  );
}
