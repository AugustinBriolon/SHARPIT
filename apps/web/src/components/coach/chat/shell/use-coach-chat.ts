'use client';

import { useChat } from '@ai-sdk/react';
import { apiFetch } from '@sharpit/ui/client/query/api-fetch';
import { useQueryClient } from '@tanstack/react-query';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from 'ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { queryKeys } from '@/client/query/keys';
import {
  COACH_CURRENT_TURN_SLOT,
  scrollTopToReveal,
} from '@/components/coach/chat/transcript/coach-current-turn';
import { serverHistoryRequestBody } from '@sharpit/app/lib/coach/chat/shell/coach-chat-server-history';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import {
  collectPendingApprovals,
  mapCoachMessages,
} from '@/components/coach/beui/coach-message-mapper';
import { humanizeCoachTransportError } from '@/components/coach/chat/shell/humanize-coach-transport-error';
import { submitCoachChatMessage } from '@/components/coach/chat/composer/coach-chat-submit';
import { invalidateCompletedCoachTools } from '@/components/coach/chat/tools/coach-chat-tool-invalidation';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { useSaveConversation, useCreateConversation } from '@/hooks/use-coach';
import { usePlannedSessions } from '@/hooks/use-data';
import { lastStepApprovalResponseFingerprint } from '@sharpit/app/lib/coach/chat/shell/coach-chat-auto-send';
import { coachApprovalReason } from '@sharpit/app/lib/coach/plan/coach-approval-reason';
import { buildKnownSessions } from '@sharpit/app/lib/coach/chat/conversations/coach-chat-known-sessions';
import {
  abortChatFetch,
  endAutoReply,
  replaceChatFetchSignal,
  tryBeginAutoReply,
} from '@sharpit/app/lib/coach/chat/shell/coach-chat-request-lock';
import {
  invalidateAfterCoachToolApproval,
  invalidatePlannedSessionsAfterCoachTurn,
} from '@/client/coach/chat/shell/coach-chat-cache';
import {
  readCoachInputDraft,
  writeCoachInputDraft,
} from '@sharpit/app/lib/coach/chat/composer/coach-input-draft';
import type { CoachDiscussContext } from '@sharpit/app/lib/coach/chat/discuss/coach-discuss-context';
import {
  AI_BUDGET_WARNING_HEADER,
  RETRY_AFTER_HEADER,
} from '@sharpit/app/lib/access/ai-budget-shared';

function coachInputPlaceholder(guardDisabled: boolean, hasPendingApprovals: boolean): string {
  if (guardDisabled) {
    return coachBeuiCopy.composerPlaceholderOffline;
  }
  if (hasPendingApprovals) {
    return coachBeuiCopy.composerPlaceholderPendingApproval;
  }
  return coachBeuiCopy.composerPlaceholder;
}

function findLastAssistantRowKey(mappedRows: ReturnType<typeof mapCoachMessages>): string | null {
  for (let i = mappedRows.length - 1; i >= 0; i -= 1) {
    if (mappedRows[i]?.kind === 'assistant') {
      return mappedRows[i]!.key;
    }
  }
  return null;
}

export function useCoachChat({
  conversationId,
  initialMessages,
  attachedContext,
  onDetachContext,
  isEphemeral = false,
  autoReply = false,
  onConversationCreated,
  onAutoReplyStarted,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
  attachedContext?: CoachDiscussContext | null;
  onDetachContext?: () => void;
  isEphemeral?: boolean;
  autoReply?: boolean;
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
  const messagesRef = useRef<UIMessage[]>(initialMessages);
  const viewportRef = useRef<HTMLElement>(null);
  const [budgetWarning, setBudgetWarning] = useState(false);
  // Epoch ms, not a boolean: lets a stale block from a previous mount/timer
  // race auto-clear itself against wall-clock time rather than trusting a
  // flag that could outlive its own timeout.
  const [budgetBlockedUntil, setBudgetBlockedUntil] = useState<number | null>(null);

  const coachTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/coach/chat',
        // A stored conversation is the server's: it sends only the new message, and the route reads
        // the thread and saves the answer. A draft not yet stored still sends its whole thread.
        ...(isEphemeral
          ? {}
          : {
              prepareSendMessagesRequest: ({ messages: thread, body }) => ({
                body: serverHistoryRequestBody({ conversationId, thread, body }),
              }),
            }),
        fetch: async (input, init) => {
          const signal = replaceChatFetchSignal(conversationId, init?.signal);
          const path = input instanceof Request ? input.url : String(input);
          const response = await apiFetch(path, { ...init, signal });
          if (response.ok) {
            setBudgetWarning(response.headers.get(AI_BUDGET_WARNING_HEADER) === '1');
            setBudgetBlockedUntil(null);
          } else if (response.status === 402) {
            setBudgetWarning(false);
            const retryAfterSeconds = Number(response.headers.get(RETRY_AFTER_HEADER));
            setBudgetBlockedUntil(
              Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
                ? Date.now() + retryAfterSeconds * 1000
                : null,
            );
          }
          return response;
        },
      }),
    [conversationId, isEphemeral],
  );

  // Server enforces the budget on every request regardless — this only
  // re-enables the composer once the wait it quoted has actually elapsed,
  // so the athlete isn't stuck disabled forever without a fresh response
  // to tell them otherwise.
  useEffect(() => {
    if (budgetBlockedUntil === null) {
      return;
    }
    const remainingMs = budgetBlockedUntil - Date.now();
    if (remainingMs <= 0) {
      setBudgetBlockedUntil(null);
      return;
    }
    const timer = setTimeout(() => setBudgetBlockedUntil(null), remainingMs);
    return () => clearTimeout(timer);
  }, [budgetBlockedUntil]);

  const budgetBlocked = budgetBlockedUntil !== null && budgetBlockedUntil > Date.now();
  const budgetRetryAfterSeconds = budgetBlocked
    ? Math.max(1, Math.ceil((budgetBlockedUntil - Date.now()) / 1000))
    : null;

  /** The server saved the thread with the answer: read its new title and date. */
  const refreshSavedConversation = useCallback(() => {
    if (isEphemeral) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
  }, [conversationId, isEphemeral, queryClient]);

  const chat = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: coachTransport,
    sendAutomaticallyWhen: ({ messages: current }) => {
      if (blockAutoSend.current) {
        return false;
      }
      if (!lastAssistantMessageIsCompleteWithApprovalResponses({ messages: current })) {
        return false;
      }
      const fingerprint = lastStepApprovalResponseFingerprint(current);
      if (!fingerprint || sentApprovalFingerprints.current.has(fingerprint)) {
        return false;
      }
      sentApprovalFingerprints.current.add(fingerprint);
      return true;
    },
    onError: () => {
      blockAutoSend.current = true;
    },
    onFinish: ({ isError, isAbort }) => {
      if (isError) {
        return;
      }
      if (isAbort) {
        blockAutoSend.current = true;
      }
      refreshSavedConversation();
      if (!isAbort) {
        invalidatePlannedSessionsAfterCoachTurn(queryClient);
      }
    },
  });

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
  } = chat;
  messagesRef.current = messages;

  const [input, setInput] = useState(() => readCoachInputDraft(conversationId));
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const loadedConversationIdRef = useRef(conversationId);

  useEffect(() => {
    if (loadedConversationIdRef.current === conversationId) {
      return;
    }
    loadedConversationIdRef.current = conversationId;
    setInput(readCoachInputDraft(conversationId));
  }, [conversationId]);

  const isBusy = status === 'submitted' || status === 'streaming';
  const streamIdle = !isBusy;
  const inputLocked = isBusy || guardDisabled || budgetBlocked;

  useEffect(() => {
    autoReplyStarted.current = false;
    sentApprovalFingerprints.current.clear();
    blockAutoSend.current = false;
    setShowJumpToLatest(false);
    setBudgetWarning(false);
    setBudgetBlockedUntil(null);
  }, [conversationId]);

  useEffect(() => {
    return () => {
      abortChatFetch(conversationId);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!autoReply || autoReplyStarted.current || isBusy) {
      return;
    }
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'user') {
      return;
    }
    if (!tryBeginAutoReply(conversationId)) {
      return;
    }
    autoReplyStarted.current = true;
    let cancelled = false;
    void regenerate()
      .catch(() => undefined)
      .finally(() => {
        endAutoReply(conversationId);
        if (!cancelled) {
          onAutoReplyStarted?.();
        }
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
      if (messages[i].role === 'assistant') {
        return i;
      }
    }
    return -1;
  }, [messages]);

  const pendingApprovals = useMemo(() => collectPendingApprovals(messages), [messages]);
  const mappedRows = useMemo(
    () =>
      mapCoachMessages({ messages, status, lastAssistantIndex }).filter(
        (row) => row.kind !== 'assistant' || !row.skip,
      ),
    [messages, status, lastAssistantIndex],
  );
  const lastAssistantRowKey = useMemo(() => findLastAssistantRowKey(mappedRows), [mappedRows]);

  // A conversation opens at its end; after that, the view only moves when the athlete asks.
  useEffect(() => {
    requestAnimationFrame(() => {
      viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'auto' });
    });
  }, [conversationId]);

  // A question just sent rises to the top of the view; its answer unrolls below without moving it.
  const risesOnSend = useRef(false);
  const lastQuestionId = useMemo(
    () => messages.findLast((message) => message.role === 'user')?.id ?? null,
    [messages],
  );
  useEffect(() => {
    if (!risesOnSend.current || !lastQuestionId) {
      return;
    }
    risesOnSend.current = false;
    // Two frames: the turn under way is laid out at its full height before the view moves.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const viewport = viewportRef.current;
        const turn = viewport?.querySelector(`[data-slot="${COACH_CURRENT_TURN_SLOT}"]`);
        if (viewport && turn) {
          viewport.scrollTo({ top: scrollTopToReveal(viewport, turn), behavior: 'smooth' });
        }
      }),
    );
  }, [lastQuestionId]);

  useEffect(() => {
    invalidateCompletedCoachTools(queryClient, messages, invalidatedToolPartKeys.current);
  }, [messages, queryClient]);

  const submit = useCallback(
    (text: string) => {
      risesOnSend.current = true;
      return submitCoachChatMessage({
        text,
        inputLocked,
        guardDisabled,
        messages,
        isEphemeral,
        conversationId,
        attachedContext,
        setShowJumpToLatest,
        setMessages,
        saveMessages,
        createConversation,
        sendMessage,
        setInput,
        onDetachContext,
        onConversationCreated,
      });
    },
    [
      attachedContext,
      conversationId,
      createConversation,
      guardDisabled,
      inputLocked,
      isEphemeral,
      messages,
      onConversationCreated,
      onDetachContext,
      saveMessages,
      sendMessage,
    ],
  );

  const scrollToLatest = useCallback((behavior: ScrollBehavior) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    setShowJumpToLatest(false);
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  }, []);

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
        if (part) {
          invalidateAfterCoachToolApproval(queryClient, part.type);
        }
      }
    },
    [addToolApprovalResponse, clearError, pendingApprovals, queryClient],
  );

  const clearChatError = useCallback(() => {
    blockAutoSend.current = false;
    setBudgetBlockedUntil(null);
    setBudgetWarning(false);
    clearError();
  }, [clearError]);

  return {
    messages,
    messagesRef,
    status,
    stop,
    error,
    input,
    setInput,
    isBusy,
    streamIdle,
    inputLocked,
    guardDisabled,
    budgetWarning,
    budgetBlocked,
    budgetRetryAfterSeconds,
    showJumpToLatest,
    setShowJumpToLatest,
    viewportRef,
    mappedRows,
    lastAssistantRowKey,
    pendingApprovals,
    knownSessions,
    submit,
    scrollToLatest,
    handleApproval,
    clearChatError,
    inputPlaceholder: coachInputPlaceholder(guardDisabled, pendingApprovals.length > 0),
    errorMessage: humanizeCoachTransportError(error),
    writeDraft: (next: string) => writeCoachInputDraft(conversationId, next),
  };
}
