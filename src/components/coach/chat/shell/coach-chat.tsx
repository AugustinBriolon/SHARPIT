'use client';

import { ArrowDown } from 'lucide-react';
import { MessageScroller } from '@/components/coach/kit/message';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import { coachBeuiTheme } from '@/components/coach/beui/coach-beui-theme';
import { CoachChatScrollerContent } from '@/components/coach/chat/transcript/coach-chat-scroller-content';
import {
  CoachBudgetBlockedChip,
  CoachBudgetWarningChip,
} from '@/components/coach/chat/composer/coach-budget-warning-chip';
import { CoachComposerShell } from '@/components/coach/chat/shell/coach-composer-chrome';
import { CoachPromptBar } from '@/components/coach/chat/composer/coach-prompt-bar';
import { useCoachChat } from '@/components/coach/chat/shell/use-coach-chat';
import { Button } from '@/components/ui/button';
import type { UIMessage } from 'ai';
import type { CoachDiscussContext } from '@/lib/coach/chat/discuss/coach-discuss-context';
import { cn } from '@/lib/utils';

type ChatState = ReturnType<typeof useCoachChat>;

type ContextHandlers = {
  attachedContext?: CoachDiscussContext | null;
  onDetachContext?: () => void;
  onAttachContext?: (context: CoachDiscussContext) => void;
};

function BudgetChip({ chat }: { chat: ChatState }) {
  const compact = 'mb-0 pt-0 pr-0';
  if (chat.budgetBlocked && chat.budgetRetryAfterSeconds) {
    return (
      <CoachBudgetBlockedChip
        className={compact}
        retryAfterSeconds={chat.budgetRetryAfterSeconds}
      />
    );
  }
  if (chat.budgetWarning) {
    return <CoachBudgetWarningChip className={compact} />;
  }
  return null;
}

function CoachJumpToLatest({ chat }: { chat: ChatState }) {
  if (!chat.showJumpToLatest) {
    return null;
  }
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-28 flex justify-center">
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
  );
}

function CoachLiveComposer({ chat, ...ctx }: ContextHandlers & { chat: ChatState }) {
  const budget = <BudgetChip chat={chat} />;

  return (
    <CoachComposerShell>
      <CoachPromptBar
        ariaLabel={coachBeuiCopy.composerAriaLabel}
        attachedContext={ctx.attachedContext ?? null}
        disabled={chat.inputLocked}
        leadingChips={budget}
        loading={chat.isBusy}
        placeholder={chat.inputPlaceholder}
        value={chat.input}
        onAttachContext={ctx.onAttachContext}
        onDetachContext={ctx.onDetachContext}
        onStop={() => chat.stop()}
        onSubmit={(value) => void chat.submit(value)}
        onValueChange={(next) => {
          chat.setInput(next);
          chat.writeDraft(next);
        }}
      />
    </CoachComposerShell>
  );
}

type CoachChatProps = ContextHandlers & {
  conversationId: string;
  initialMessages: UIMessage[];
  isEphemeral?: boolean;
  autoReply?: boolean;
  header?: React.ReactNode;
  onConversationCreated?: (id: string) => void;
  onAutoReplyStarted?: () => void;
};

function useCoachChatPanel(props: CoachChatProps) {
  return useCoachChat({
    conversationId: props.conversationId,
    initialMessages: props.initialMessages,
    attachedContext: props.attachedContext,
    onDetachContext: props.onDetachContext,
    isEphemeral: props.isEphemeral,
    autoReply: props.autoReply,
    onConversationCreated: props.onConversationCreated,
    onAutoReplyStarted: props.onAutoReplyStarted,
  });
}

export function CoachChat(props: CoachChatProps) {
  const chat = useCoachChatPanel(props);
  const { header, attachedContext, onDetachContext, onAttachContext } = props;

  return (
    <div className={coachBeuiTheme.panel}>
      <div className={cn(coachBeuiTheme.column, 'flex h-full min-h-0 flex-col')}>
        {header ? (
          <div className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-10 shrink-0 px-3 py-1.5 backdrop-blur-md sm:px-4 sm:py-2">
            {header}
          </div>
        ) : null}
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
          <CoachChatScrollerContent chat={chat} />
        </MessageScroller>
        <CoachJumpToLatest chat={chat} />
        <CoachLiveComposer
          attachedContext={attachedContext}
          chat={chat}
          onAttachContext={onAttachContext}
          onDetachContext={onDetachContext}
        />
      </div>
    </div>
  );
}
