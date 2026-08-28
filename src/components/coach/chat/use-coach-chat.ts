'use client';

import { useChat } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from 'ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import {
  collectPendingApprovals,
  mapCoachMessages,
} from '@/components/coach/beui/coach-message-mapper';
import { submitCoachChatMessage } from '@/components/coach/chat/coach-chat-submit';
import { invalidateCompletedCoachTools } from '@/components/coach/chat/coach-chat-tool-invalidation';
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
  invalidateAfterCoachToolApproval,
  invalidatePlannedSessionsAfterCoachTurn,
} from '@/lib/coach/chat/coach-chat-cache';
import { readCoachInputDraft, writeCoachInputDraft } from '@/lib/coach/chat/coach-input-draft';
import type { CoachDiscussContext } from '@/lib/coach/chat/coach-discuss-context';

function coachInputPlaceholder(guardDisabled: boolean, hasPendingApprovals: boolean): string {
  if (guardDisabled) {
    return coachBeuiCopy.composerPlaceholderOffline;
  }
  if (hasPendingApprovals) {
    return coachBeuiCopy.composerPlaceholderPendingApproval;
  }
  return coachBeuiCopy.composerPlaceholder;
}

function coachErrorMessage(error: Error | undefined): string {
  if (error?.message && !error.message.toLowerCase().includes('api key')) {
    return error.message;
  }
  return coachBeuiCopy.genericError;
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

  const persistMessages = useCallback(
    (all: UIMessage[]) => {
      if (isEphemeral || !hasPersistableAssistant(all)) {
        return;
      }
      const fingerprint = coachMessagesFingerprint(all);
      if (fingerprint === lastPersistedFingerprint.current) {
        return;
      }
      lastPersistedFingerprint.current = fingerprint;
      void saveMessages({ id: conversationId, messages: all }).catch((err) =>
        console.error('[coach-chat] save', err),
      );
    },
    [conversationId, isEphemeral, saveMessages],
  );

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
    onFinish: ({ messages: all, isError, isAbort }) => {
      if (isError) {
        return;
      }
      if (isAbort) {
        blockAutoSend.current = true;
      }
      persistMessages(all);
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
  const inputLocked = isBusy || guardDisabled;

  useEffect(() => {
    autoReplyStarted.current = false;
    sentApprovalFingerprints.current.clear();
    blockAutoSend.current = false;
    lastPersistedFingerprint.current = '';
    setShowJumpToLatest(false);
  }, [conversationId]);

  useEffect(() => {
    if (status === 'ready') {
      persistMessages(messages);
    }
  }, [status, messages, persistMessages]);

  useEffect(() => {
    return () => {
      persistMessages(messagesRef.current);
      abortChatFetch(conversationId);
    };
  }, [conversationId, persistMessages]);

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

  const prevStatusRef = useRef(status);
  useEffect(() => {
    const previous = prevStatusRef.current;
    prevStatusRef.current = status;
    if (previous !== 'streaming' && previous !== 'submitted') {
      return;
    }
    if (status !== 'ready') {
      return;
    }
    requestAnimationFrame(() => {
      viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'auto' });
    });
  }, [status]);

  useEffect(() => {
    invalidateCompletedCoachTools(queryClient, messages, invalidatedToolPartKeys.current);
  }, [messages, queryClient]);

  const submit = useCallback(
    (text: string) =>
      submitCoachChatMessage({
        text,
        inputLocked,
        guardDisabled,
        messages,
        isEphemeral,
        conversationId,
        attachedContext,
        setShowJumpToLatest,
        viewportRef,
        setMessages,
        saveMessages,
        createConversation,
        sendMessage,
        setInput,
        onDetachContext,
        onConversationCreated,
      }),
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
    errorMessage: coachErrorMessage(error),
    writeDraft: (next: string) => writeCoachInputDraft(conversationId, next),
  };
}
