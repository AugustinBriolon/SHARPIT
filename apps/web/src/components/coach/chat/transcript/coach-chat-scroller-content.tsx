'use client';

import { Message } from '@/components/coach/kit/message';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import { CoachBeuiLoadingStatus } from '@/components/coach/beui/coach-beui-loading';
import { showSubmittedPlaceholder } from '@/components/coach/beui/coach-message-mapper';
import { coachBeuiTheme } from '@/components/coach/beui/coach-beui-theme';
import { CoachToolApprovalCard } from '@/components/coach/beui/coach-tool-approval-card';
import { CoachChatEmptyState } from '@/components/coach/chat/transcript/coach-chat-empty-state';
import { CoachChatTranscriptRows } from '@/components/coach/chat/transcript/coach-chat-transcript';
import { Button } from '@sharpit/ui/components/ui/button';
import { cn } from '@sharpit/app/lib/utils';
import {
  COACH_CURRENT_TURN_SLOT,
  splitCurrentTurn,
} from '@/components/coach/chat/transcript/coach-current-turn';
import type { useCoachChat } from '@/components/coach/chat/shell/use-coach-chat';

type CoachChatState = ReturnType<typeof useCoachChat>;

export function CoachChatScrollerContent({ chat }: { chat: CoachChatState }) {
  const turns = splitCurrentTurn(chat.mappedRows);
  return (
    <>
      {chat.messages.length === 0 ? (
        <CoachChatEmptyState
          disabled={chat.inputLocked}
          onSuggestionClick={(text) => void chat.submit(text)}
        />
      ) : null}

      <CoachChatTranscriptRows
        lastAssistantRowKey={chat.lastAssistantRowKey}
        mappedRows={turns.earlier}
        streamIdle={chat.streamIdle}
      />

      {/* The turn under way fills at least the viewport, so a question just sent can rise to
          its top while the answer unrolls below it. */}
      <div
        data-slot={COACH_CURRENT_TURN_SLOT}
        className={cn(
          'flex flex-col space-y-4',
          turns.current.length > 0 && 'min-h-[calc(100cqh-2rem)]',
        )}
      >
        <CoachChatTranscriptRows
          lastAssistantRowKey={chat.lastAssistantRowKey}
          mappedRows={turns.current}
          streamIdle={chat.streamIdle}
        />

        {showSubmittedPlaceholder(chat.status, chat.messages) ? (
          <Message from="assistant">
            <div className={coachBeuiTheme.typingBubble}>
              <CoachBeuiLoadingStatus />
            </div>
          </Message>
        ) : null}

        <CoachChatApprovals chat={chat} />

        <CoachChatError chat={chat} />
      </div>
    </>
  );
}

function CoachChatError({ chat }: { chat: CoachChatState }) {
  return (
    <>
      {chat.error ? (
        <div
          className="border-destructive/25 bg-destructive/8 text-destructive max-w-2xl space-y-2 rounded-lg border p-3 text-sm"
          role="alert"
        >
          <p className="font-medium text-pretty">{coachBeuiCopy.errorTitle}</p>
          <p className="text-destructive/90 text-pretty">{chat.errorMessage}</p>
          <Button size="sm" type="button" variant="outline" onClick={chat.clearChatError}>
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
