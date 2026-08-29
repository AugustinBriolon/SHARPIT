'use client';

import { ArrowDown } from 'lucide-react';
import { MessageScroller } from '@/components/agents/message';
import { PromptInput } from '@/components/agents/prompt-input';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import { coachBeuiTheme } from '@/components/coach/beui/coach-beui-theme';
import { CoachChatScrollerContent } from '@/components/coach/chat/coach-chat-scroller-content';
import {
  CoachBudgetBlockedChip,
  CoachBudgetWarningChip,
} from '@/components/coach/chat/coach-budget-warning-chip';
import { CoachComposerShell } from '@/components/coach/chat/coach-composer-chrome';
import { CoachContextChip } from '@/components/coach/chat/coach-context-chip';
import { useCoachChat } from '@/components/coach/chat/use-coach-chat';
import { Button } from '@/components/ui/button';
import type { UIMessage } from 'ai';
import type { CoachDiscussContext } from '@/lib/coach/chat/coach-discuss-context';

function composerContextSlot({
  attachedContext,
  onDetachContext,
  chat,
}: {
  attachedContext?: CoachDiscussContext | null;
  onDetachContext?: () => void;
  chat: ReturnType<typeof useCoachChat>;
}) {
  let budgetChip: React.ReactNode = null;
  if (chat.budgetBlocked && chat.budgetRetryAfterSeconds) {
    budgetChip = <CoachBudgetBlockedChip retryAfterSeconds={chat.budgetRetryAfterSeconds} />;
  } else if (chat.budgetWarning) {
    budgetChip = <CoachBudgetWarningChip />;
  }

  if (!attachedContext && !budgetChip) {
    return null;
  }
  return (
    <>
      {attachedContext ? (
        <CoachContextChip context={attachedContext} onDetach={() => onDetachContext?.()} />
      ) : null}
      {budgetChip}
    </>
  );
}

export function CoachChat({
  conversationId,
  initialMessages,
  attachedContext,
  onDetachContext,
  isEphemeral = false,
  autoReply = false,
  header,
  onConversationCreated,
  onAutoReplyStarted,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
  attachedContext?: CoachDiscussContext | null;
  onDetachContext?: () => void;
  isEphemeral?: boolean;
  autoReply?: boolean;
  header?: React.ReactNode;
  onConversationCreated?: (id: string) => void;
  onAutoReplyStarted?: () => void;
}) {
  const chat = useCoachChat({
    conversationId,
    initialMessages,
    attachedContext,
    onDetachContext,
    isEphemeral,
    autoReply,
    onConversationCreated,
    onAutoReplyStarted,
  });

  return (
    <div className={coachBeuiTheme.panel}>
      <MessageScroller
        busy={chat.isBusy}
        className={coachBeuiTheme.scrollerViewport}
        contentClassName={coachBeuiTheme.scrollerContent}
        followThreshold={56}
        label={coachBeuiCopy.transcriptLabel}
        viewportRef={chat.viewportRef}
        followOutput
        smooth
        onFollowChange={(following) => {
          chat.setShowJumpToLatest(!following && chat.messagesRef.current.length > 0);
        }}
      >
        <CoachChatScrollerContent chat={chat} header={header} />
      </MessageScroller>

      {chat.showJumpToLatest ? (
        <div className="pointer-events-none absolute right-2.5 bottom-28 flex justify-center">
          <Button
            aria-label={coachBeuiCopy.jumpToLatest}
            className={coachBeuiTheme.jumpButton}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => chat.scrollToLatest('smooth')}
          >
            <ArrowDown className="size-3.5" aria-hidden />
          </Button>
        </div>
      ) : null}

      <CoachComposerShell
        contextSlot={composerContextSlot({ attachedContext, onDetachContext, chat })}
      >
        <PromptInput
          aria-label={coachBeuiCopy.composerAriaLabel}
          className={coachBeuiTheme.promptInput}
          disabled={chat.inputLocked}
          loading={chat.isBusy}
          maxRows={8}
          minRows={1}
          placeholder={chat.inputPlaceholder}
          value={chat.input}
          onStop={() => chat.stop()}
          onSubmit={(value) => void chat.submit(value)}
          onValueChange={(next) => {
            chat.setInput(next);
            chat.writeDraft(next);
          }}
        />
      </CoachComposerShell>
    </div>
  );
}
