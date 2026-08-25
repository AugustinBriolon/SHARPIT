'use client';

import { useChat } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from 'ai';
import { ArrowDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgentActivity } from '@/components/agents/agent-activity';
import {
  Message,
  MessageBubble,
  MessageBubbleContent,
  MessageScroller,
} from '@/components/agents/message';
import { PromptInput } from '@/components/agents/prompt-input';
import { StreamingResponse } from '@/components/agents/streaming-response';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import { CoachBeuiLoadingStatus } from '@/components/coach/beui/coach-beui-loading';
import {
  collectPendingApprovals,
  mapCoachMessages,
  showSubmittedPlaceholder,
} from '@/components/coach/beui/coach-message-mapper';
import { coachBeuiTheme } from '@/components/coach/beui/coach-beui-theme';
import { CoachToolApprovalCard } from '@/components/coach/beui/coach-tool-approval-card';
import { toolPartsToAgentActivity } from '@/components/coach/beui/coach-tool-activity-items';
import { CoachMessage } from '@/components/coach/chat/coach-message';
import { CoachProvenanceChips } from '@/components/coach/chat/coach-provenance-chips';
import { CoachReasoning } from '@/components/coach/chat/coach-reasoning';
import { CoachChatEmptyState } from '@/components/coach/chat/coach-chat-empty-state';
import { CoachComposerShell } from '@/components/coach/chat/coach-composer-chrome';
import { CoachContextChip } from '@/components/coach/chat/coach-context-chip';
import { Button } from '@/components/ui/button';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { useSaveConversation, useCreateConversation } from '@/hooks/use-coach';
import { usePlannedSessions } from '@/hooks/use-data';
import { lastStepApprovalResponseFingerprint } from '@/lib/coach/chat/coach-chat-auto-send';
import { coachApprovalReason } from '@/lib/coach/plan/coach-approval-reason';
import { buildKnownSessions } from '@/lib/coach/chat/coach-chat-known-sessions';
import {
  coachMessagesFingerprint,
  hasPersistableAssistant,
} from '@/lib/coach/chat/coach-chat-persist';
import {
  abortChatFetch,
  endAutoReply,
  replaceChatFetchSignal,
  tryBeginAutoReply,
} from '@/lib/coach/chat/coach-chat-request-lock';
import {
  CALENDAR_MUTATION_TOOL_TYPES,
  dismissUnresolvedCalendarTools,
  hasUnresolvedCalendarTools,
} from '@/lib/coach/chat/coach-tool-parts';
import {
  invalidateAfterCoachToolApproval,
  invalidateAfterCoachTools,
  invalidatePlannedSessionsAfterCoachTurn,
} from '@/lib/coach/chat/coach-chat-cache';
import {
  clearCoachInputDraft,
  readCoachInputDraft,
  writeCoachInputDraft,
} from '@/lib/coach/chat/coach-input-draft';
import type { CoachDiscussContext } from '@/lib/coach/chat/coach-discuss-context';
import { createClientId } from '@/lib/client-id';
import { cn } from '@/lib/utils';

function AssistantAnswerBody({ live, text }: { live: boolean; text: string }) {
  if (text) {
    return (
      <StreamingResponse
        announce={false}
        showActions={false}
        status={live ? 'streaming' : 'complete'}
      >
        <CoachMessage streaming={live}>{text}</CoachMessage>
      </StreamingResponse>
    );
  }

  if (live) {
    return <CoachBeuiLoadingStatus label={coachBeuiCopy.drafting} />;
  }

  return null;
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
  const queryClient = useQueryClient();
  const { guardDisabled } = useOfflineGuard();
  const { mutateAsync: saveMessages } = useSaveConversation();
  const createConversation = useCreateConversation();
  const { data: plannedSessions } = usePlannedSessions();
  const autoReplyStarted = useRef(false);
  const invalidatedToolPartKeys = useRef<Set<string>>(new Set());
  const sentApprovalFingerprints = useRef<Set<string>>(new Set());
  const blockAutoSend = useRef(false);
  const lastPersistedFingerprint = useRef<string>('');
  const messagesRef = useRef<UIMessage[]>(initialMessages);
  const viewportRef = useRef<HTMLElement>(null);

  const coachTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/coach/chat',
        fetch: (input, init) => {
          const signal = replaceChatFetchSignal(conversationId, init?.signal);
          return fetch(input, { ...init, signal });
        },
      }),
    [conversationId],
  );

  const persistMessages = (all: UIMessage[]) => {
    if (isEphemeral || !hasPersistableAssistant(all)) return;
    const fingerprint = coachMessagesFingerprint(all);
    if (fingerprint === lastPersistedFingerprint.current) return;
    lastPersistedFingerprint.current = fingerprint;
    void saveMessages({ id: conversationId, messages: all }).catch((err) =>
      console.error('[coach-chat] save', err),
    );
  };

  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    addToolApprovalResponse,
    setMessages,
    regenerate,
    clearError,
  } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: coachTransport,
    sendAutomaticallyWhen: ({ messages: current }) => {
      if (blockAutoSend.current) return false;
      if (!lastAssistantMessageIsCompleteWithApprovalResponses({ messages: current })) {
        return false;
      }
      const fingerprint = lastStepApprovalResponseFingerprint(current);
      if (!fingerprint) return false;
      if (sentApprovalFingerprints.current.has(fingerprint)) return false;
      sentApprovalFingerprints.current.add(fingerprint);
      return true;
    },
    onError: () => {
      blockAutoSend.current = true;
    },
    onFinish: ({ messages: all, isError, isAbort }) => {
      if (isError) return;
      if (isAbort) blockAutoSend.current = true;
      persistMessages(all);
      if (!isAbort) {
        invalidatePlannedSessionsAfterCoachTurn(queryClient);
      }
    },
  });
  messagesRef.current = messages;

  const [input, setInput] = useState(() => readCoachInputDraft(conversationId));
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const loadedConversationIdRef = useRef(conversationId);

  useEffect(() => {
    if (loadedConversationIdRef.current === conversationId) return;
    loadedConversationIdRef.current = conversationId;
    setInput(readCoachInputDraft(conversationId));
  }, [conversationId]);

  const isBusy = status === 'submitted' || status === 'streaming';
  const streamIdle = !isBusy;

  useEffect(() => {
    autoReplyStarted.current = false;
    sentApprovalFingerprints.current.clear();
    blockAutoSend.current = false;
    lastPersistedFingerprint.current = '';
    setShowJumpToLatest(false);
  }, [conversationId]);

  useEffect(() => {
    if (status !== 'ready') return;
    persistMessages(messages);
  }, [status, messages, conversationId, isEphemeral]);

  useEffect(() => {
    return () => {
      persistMessages(messagesRef.current);
      abortChatFetch(conversationId);
    };
  }, [conversationId, isEphemeral]);

  useEffect(() => {
    if (!autoReply || autoReplyStarted.current || isBusy) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'user') return;
    if (!tryBeginAutoReply(conversationId)) return;
    autoReplyStarted.current = true;
    let cancelled = false;
    void regenerate()
      .catch(() => undefined)
      .finally(() => {
        endAutoReply(conversationId);
        if (!cancelled) onAutoReplyStarted?.();
      });
    return () => {
      cancelled = true;
      endAutoReply(conversationId);
    };
  }, [autoReply, conversationId, isBusy, messages, onAutoReplyStarted, regenerate]);

  const knownSessions = useMemo(
    () => buildKnownSessions(messages, plannedSessions),
    [messages, plannedSessions],
  );

  const lastAssistantIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  }, [messages]);

  const pendingApprovals = useMemo(() => collectPendingApprovals(messages), [messages]);
  const hasPendingApprovals = pendingApprovals.length > 0;
  const inputLocked = isBusy || guardDisabled;

  const mappedRows = useMemo(
    () =>
      mapCoachMessages({
        messages,
        status,
        lastAssistantIndex,
      }).filter((row) => row.kind !== 'assistant' || !row.skip),
    [messages, status, lastAssistantIndex],
  );

  const lastAssistantRowKey = useMemo(() => {
    for (let i = mappedRows.length - 1; i >= 0; i -= 1) {
      if (mappedRows[i]?.kind === 'assistant') return mappedRows[i]!.key;
    }
    return null;
  }, [mappedRows]);

  const prevStatusRef = useRef(status);
  useEffect(() => {
    const previous = prevStatusRef.current;
    prevStatusRef.current = status;
    if (previous !== 'streaming' && previous !== 'submitted') return;
    if (status !== 'ready') return;
    requestAnimationFrame(() => {
      viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'auto' });
    });
  }, [status]);

  useEffect(() => {
    const newlyCompletedKeys: string[] = [];
    for (const m of messages) {
      if (m.role !== 'assistant') continue;
      for (const p of m.parts) {
        if (!p.type.startsWith('tool-')) continue;
        const part = p as { type: string; state?: string; output?: { ok?: boolean } };
        const completed =
          CALENDAR_MUTATION_TOOL_TYPES.has(part.type) &&
          part.state === 'output-available' &&
          part.output?.ok !== false;
        if (!completed) continue;
        const key = `${m.id}:${part.type}`;
        if (!invalidatedToolPartKeys.current.has(key)) newlyCompletedKeys.push(key);
      }
    }
    if (newlyCompletedKeys.length > 0) {
      for (const key of newlyCompletedKeys) invalidatedToolPartKeys.current.add(key);
      invalidateAfterCoachTools(queryClient);
    }
  }, [messages, queryClient]);

  async function submit(text: string) {
    const value = text.trim();
    if (!value || inputLocked || guardDisabled) return;

    setShowJumpToLatest(false);
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }

    if (hasUnresolvedCalendarTools(messages)) {
      const dismissed = dismissUnresolvedCalendarTools(messages);
      setMessages(dismissed);
      if (!isEphemeral) {
        saveMessages({ id: conversationId, messages: dismissed }).catch((err) =>
          console.error('[coach-chat] save dismiss', err),
        );
      }
    }

    if (isEphemeral) {
      const userMessage: UIMessage = {
        id: createClientId(),
        role: 'user',
        parts: [{ type: 'text', text: value }],
      };
      try {
        const conversation = await createConversation.mutateAsync({ messages: [userMessage] });
        clearCoachInputDraft(conversationId);
        setInput('');
        onConversationCreated?.(conversation.id);
      } catch (err) {
        console.error('[coach-chat] create', err);
      }
      return;
    }

    sendMessage({ text: value });
    clearCoachInputDraft(conversationId);
    setInput('');
  }

  const scrollToLatest = useCallback((behavior: ScrollBehavior) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setShowJumpToLatest(false);
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  }, []);

  const coachErrorMessage =
    error?.message && !error.message.toLowerCase().includes('api key')
      ? error.message
      : coachBeuiCopy.genericError;

  const inputPlaceholder = (() => {
    if (guardDisabled) return coachBeuiCopy.composerPlaceholderOffline;
    if (hasPendingApprovals) return coachBeuiCopy.composerPlaceholderPendingApproval;
    return coachBeuiCopy.composerPlaceholder;
  })();

  const handleApproval = useCallback(
    (id: string, approved: boolean) => {
      blockAutoSend.current = false;
      clearError();
      addToolApprovalResponse({
        id,
        approved,
        reason: coachApprovalReason(approved),
      });
      if (approved) {
        const part = pendingApprovals.find((p) => p.approval?.id === id);
        if (part) invalidateAfterCoachToolApproval(queryClient, part.type);
      }
    },
    [addToolApprovalResponse, clearError, pendingApprovals, queryClient],
  );

  return (
    <div className={coachBeuiTheme.panel}>
      <MessageScroller
        busy={isBusy}
        className={coachBeuiTheme.scrollerViewport}
        contentClassName={coachBeuiTheme.scrollerContent}
        followThreshold={56}
        label={coachBeuiCopy.transcriptLabel}
        viewportRef={viewportRef}
        followOutput
        smooth
        onFollowChange={(following) => {
          setShowJumpToLatest(!following && messagesRef.current.length > 0);
        }}
      >
        {header && (
          <div className="bg-background fixed top-0 right-0 left-0 z-10 px-3 py-2">{header}</div>
        )}

        {messages.length === 0 ? (
          <CoachChatEmptyState
            disabled={inputLocked}
            onSuggestionClick={(text) => void submit(text)}
          />
        ) : null}

        {mappedRows.map((row) => {
          if (row.kind === 'user') {
            return (
              <Message key={row.key} className={cn(!row.live && 'cv-auto')} from="user" animateIn>
                <MessageBubble variant="ghost">
                  <MessageBubbleContent className={coachBeuiTheme.userBubble}>
                    {row.text}
                  </MessageBubbleContent>
                </MessageBubble>
              </Message>
            );
          }

          const activity = toolPartsToAgentActivity(row.toolParts, streamIdle);

          return (
            <Message
              key={row.key}
              className={cn(!row.live && row.key !== lastAssistantRowKey && 'cv-auto')}
              from="assistant"
            >
              <MessageBubble variant="ghost">
                <MessageBubbleContent className={coachBeuiTheme.assistantBubble}>
                  <CoachReasoning
                    hasAnswerText={row.text.length > 0}
                    streaming={row.live}
                    text={row.reasoning}
                  />
                  <AssistantAnswerBody live={row.live} text={row.text} />
                  {activity.items.length > 0 ? (
                    <AgentActivity
                      activeLabel={coachBeuiCopy.agentToolsWorking}
                      className={coachBeuiTheme.agentActivity}
                      defaultOpen={false}
                      items={activity.items}
                      status={activity.status}
                      summary={coachBeuiCopy.agentToolsComplete(activity.items.length)}
                      renderWorkingStatus={({ label }) => (
                        <CoachBeuiLoadingStatus label={String(label)} />
                      )}
                      collapseOnComplete
                    />
                  ) : null}
                  {streamIdle && row.showProvenance ? <CoachProvenanceChips /> : null}
                </MessageBubbleContent>
              </MessageBubble>
            </Message>
          );
        })}

        {showSubmittedPlaceholder(status, messages) && (
          <Message from="assistant">
            <MessageBubble variant="ghost">
              <MessageBubbleContent className={coachBeuiTheme.typingBubble}>
                <CoachBeuiLoadingStatus />
              </MessageBubbleContent>
            </MessageBubble>
          </Message>
        )}

        {pendingApprovals.length > 0 && (
          <div
            aria-label={coachBeuiCopy.approvalsRegionLabel}
            className={coachBeuiTheme.approvalsRegion}
            role="region"
          >
            <p className={coachBeuiTheme.approvalsHeading}>
              <span className={coachBeuiTheme.approvalsBadge}>{pendingApprovals.length}</span>
              {pendingApprovals.length === 1
                ? coachBeuiCopy.pendingApprovalOne
                : coachBeuiCopy.pendingApprovalMany}
            </p>
            {pendingApprovals.map((part, i) => (
              <CoachToolApprovalCard
                key={part.approval?.id ?? `${part.type}:${i}`}
                disabled={guardDisabled}
                knownSessions={knownSessions}
                part={part}
                onApproval={handleApproval}
              />
            ))}
          </div>
        )}

        {error ? (
          <div
            className="bg-destructive/10 text-destructive space-y-2 rounded-md p-3 text-sm"
            role="alert"
          >
            <p>{coachErrorMessage}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                blockAutoSend.current = false;
                clearError();
              }}
            >
              {coachBeuiCopy.retryLater}
            </Button>
          </div>
        ) : null}
      </MessageScroller>

      {showJumpToLatest && (
        <div className="pointer-events-none absolute right-2.5 bottom-28 flex justify-center">
          <Button
            aria-label={coachBeuiCopy.jumpToLatest}
            className={coachBeuiTheme.jumpButton}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => scrollToLatest('smooth')}
          >
            <ArrowDown className="size-3.5" aria-hidden />
          </Button>
        </div>
      )}

      <CoachComposerShell
        contextSlot={
          attachedContext ? (
            <CoachContextChip context={attachedContext} onDetach={() => onDetachContext?.()} />
          ) : null
        }
      >
        <PromptInput
          aria-label={coachBeuiCopy.composerAriaLabel}
          className={coachBeuiTheme.promptInput}
          disabled={inputLocked}
          loading={isBusy}
          maxRows={8}
          minRows={1}
          placeholder={inputPlaceholder}
          value={input}
          onStop={() => stop()}
          onSubmit={(value) => void submit(value)}
          onValueChange={(next) => {
            setInput(next);
            writeCoachInputDraft(conversationId, next);
          }}
        />
      </CoachComposerShell>
    </div>
  );
}
