'use client';

import { useChat } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from 'ai';
import { Loader2, Send, Square } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CoachMessage } from '@/components/coach/chat/coach-message';
import { CoachProvenanceChips } from '@/components/coach/chat/coach-provenance-chips';
import { ToolActivityList } from '@/components/coach/chat/tool-activity-list';
import { ToolActivity } from '@/components/coach/chat/tool-activity';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSaveConversation, useCreateConversation } from '@/hooks/use-coach';
import { usePlannedSessions } from '@/hooks/use-data';
import { lastStepApprovalResponseFingerprint } from '@/lib/coach/coach-chat-auto-send';
import { buildKnownSessions, COACH_CHAT_SUGGESTIONS } from '@/lib/coach/coach-chat-known-sessions';
import { coachMessagesFingerprint, hasPersistableAssistant } from '@/lib/coach/coach-chat-persist';
import {
  abortChatFetch,
  endAutoReply,
  replaceChatFetchSignal,
  tryBeginAutoReply,
} from '@/lib/coach/coach-chat-request-lock';
import {
  CALENDAR_MUTATION_TOOL_TYPES,
  dismissUnresolvedCalendarTools,
  hasUnresolvedCalendarTools,
  type ToolPartLite,
} from '@/lib/coach/coach-tool-parts';
import {
  invalidateAfterCoachToolApproval,
  invalidateAfterCoachTools,
  invalidatePlannedSessionsAfterCoachTurn,
} from '@/lib/coach/coach-chat-cache';
import {
  clearCoachInputDraft,
  readCoachInputDraft,
  writeCoachInputDraft,
} from '@/lib/coach/coach-input-draft';
import { createClientId } from '@/lib/client-id';

const SUGGESTIONS = COACH_CHAT_SUGGESTIONS;

export function CoachChat({
  conversationId,
  initialMessages,
  bootstrapPrompt,
  isEphemeral = false,
  autoReply = false,
  header,
  onConversationCreated,
  onAutoReplyStarted,
  onBootstrapApplied,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
  bootstrapPrompt?: string;
  isEphemeral?: boolean;
  autoReply?: boolean;
  /** Rendered sticky at the top of the message scroll region (mobile fixed layout). */
  header?: React.ReactNode;
  onConversationCreated?: (id: string) => void;
  onAutoReplyStarted?: () => void;
  /** Fired once after a discuss bootstrap has been written into the composer. */
  onBootstrapApplied?: () => void;
}) {
  const queryClient = useQueryClient();
  const { mutateAsync: saveMessages } = useSaveConversation();
  const createConversation = useCreateConversation();
  const { data: plannedSessions } = usePlannedSessions();
  const autoReplyStarted = useRef(false);
  const invalidatedToolPartKeys = useRef<Set<string>>(new Set());
  /** Prevents infinite auto-continue when approval-responded parts stay stuck. */
  const sentApprovalFingerprints = useRef<Set<string>>(new Set());
  const blockAutoSend = useRef(false);
  const lastPersistedFingerprint = useRef<string>('');
  const messagesRef = useRef<UIMessage[]>(initialMessages);

  const coachTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/coach/chat',
        // Keep abort controller registered for the whole SSE lifetime (not just TTFB).
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
      // Stop any further auto-continues for this conversation until the athlete acts again.
      blockAutoSend.current = true;
    },
    onFinish: ({ messages: all, isError, isAbort }) => {
      if (isError) return;
      // An aborted twin request must not auto-continue into another makeRequest.
      if (isAbort) blockAutoSend.current = true;
      // Persist even on abort: Strict Mode / twin-request cancel can mark isAbort while
      // the UI already holds a usable assistant turn.
      persistMessages(all);
      if (!isAbort) {
        invalidatePlannedSessionsAfterCoachTurn(queryClient);
      }
    },
  });
  messagesRef.current = messages;
  const [input, setInput] = useState('');
  const draftReady = useRef(false);
  const bootstrapApplied = useRef(false);
  const onBootstrapAppliedRef = useRef(onBootstrapApplied);
  onBootstrapAppliedRef.current = onBootstrapApplied;

  // Restore unfinished input, or apply "Discuter avec le coach" once (never overwrite edits).
  useEffect(() => {
    draftReady.current = false;
    bootstrapApplied.current = false;
  }, [conversationId]);

  useEffect(() => {
    if (bootstrapPrompt && initialMessages.length === 0 && !bootstrapApplied.current) {
      bootstrapApplied.current = true;
      setInput(bootstrapPrompt);
      writeCoachInputDraft(conversationId, bootstrapPrompt);
      draftReady.current = true;
      onBootstrapAppliedRef.current?.();
      return;
    }
    if (draftReady.current) return;
    draftReady.current = true;
    const draft = readCoachInputDraft(conversationId);
    if (draft) setInput(draft);
  }, [bootstrapPrompt, conversationId, initialMessages.length]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);

  const isBusy = status === 'submitted' || status === 'streaming';
  const streamIdle = !isBusy;

  useEffect(() => {
    autoReplyStarted.current = false;
    sentApprovalFingerprints.current.clear();
    blockAutoSend.current = false;
    lastPersistedFingerprint.current = '';
  }, [conversationId]);

  // Flush assistant turns when the stream settles (covers SDK onFinish races on abort).
  useEffect(() => {
    if (status !== 'ready') return;
    persistMessages(messages);
  }, [status, messages, conversationId, isEphemeral]);

  // Leave conversation / Strict Mode remount: save first, then abort in-flight SSE.
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
      // Strict Mode remount: release lock so the surviving instance can start once.
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

  const pendingApprovals: ToolPartLite[] = [];
  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    for (const part of message.parts) {
      if (!part.type.startsWith('tool-')) continue;
      const lite = part as ToolPartLite;
      if (lite.state === 'approval-requested' && lite.approval && !lite.approval.isAutomatic) {
        pendingApprovals.push(lite);
      }
    }
  }

  const hasPendingApprovals = pendingApprovals.length > 0;

  // Seul le streaming bloque l'input — les propositions en attente ne doivent jamais verrouiller la conversation.
  const inputLocked = isBusy;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: initialScrollDone.current ? 'smooth' : 'instant',
    });
    initialScrollDone.current = true;
  }, [messages]);

  useEffect(() => {
    const newlyCompletedKeys: string[] = [];
    for (const m of messages) {
      if (m.role !== 'assistant') continue;
      for (const p of m.parts) {
        if (!p.type.startsWith('tool-')) continue;
        const part = p as ToolPartLite;
        const completed =
          CALENDAR_MUTATION_TOOL_TYPES.has(part.type) &&
          part.state === 'output-available' &&
          (part.output as { ok?: boolean } | undefined)?.ok !== false;
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
    if (!value || inputLocked) return;

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

  const coachErrorMessage =
    error?.message && !error.message.toLowerCase().includes('api key')
      ? error.message
      : 'Une erreur est survenue. Réessaie dans un instant.';

  const inputPlaceholder = hasPendingApprovals
    ? "Réponds à la proposition, ou envoie un nouveau message pour l'ignorer…"
    : 'Demande conseil à ton coach…';

  return (
    <div className="rounded-analysis-lg flex h-full min-w-0 flex-1 flex-col lg:border">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {header && <div className="bg-background sticky top-0 z-10">{header}</div>}
        <div className="space-y-4 p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <p className="text-muted-foreground max-w-sm text-sm">
                Pose une question à ton coach. Il connaît ta forme, ta récupération, tes seuils et
                tes objectifs.
              </p>
              <div
                aria-label="Suggestions"
                className="flex flex-wrap justify-center gap-2"
                role="group"
              >
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="chip-surface text-foreground/80 hover:border-primary/40 hover:text-foreground min-h-11 rounded-full px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-9"
                    disabled={inputLocked}
                    type="button"
                    onClick={() => submit(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, messageIndex) => {
            const rowKey = `${message.id}:${messageIndex}`;
            const isUser = message.role === 'user';
            const text = message.parts
              .filter((p) => p.type === 'text')
              .map((p) => (p as { text: string }).text)
              .join('');
            const toolParts = message.parts.filter((p) => p.type.startsWith('tool-'));

            if (isUser) {
              return (
                <div key={rowKey} className="flex justify-end">
                  <div className="bg-accent text-foreground max-w-[85%] rounded-[18px_18px_4px_18px] px-4 py-2.5 text-sm whitespace-pre-wrap">
                    {text}
                  </div>
                </div>
              );
            }

            const inlineParts = toolParts.filter(
              (p) => (p as ToolPartLite).state !== 'approval-requested',
            );

            if (!text && inlineParts.length === 0) return null;

            return (
              <div key={rowKey} className="flex justify-start">
                <div className="bg-analysis-surface-alt text-foreground w-full max-w-[90%] space-y-2 rounded-[18px_18px_18px_4px] px-4 py-3">
                  {text && <CoachMessage>{text}</CoachMessage>}
                  <ToolActivityList parts={inlineParts as ToolPartLite[]} streamIdle={streamIdle} />
                  {streamIdle && text && messageIndex === lastAssistantIndex ? (
                    <CoachProvenanceChips />
                  ) : null}
                </div>
              </div>
            );
          })}

          {status === 'submitted' && (
            <div aria-live="polite" className="flex justify-start" role="status">
              <div className="bg-analysis-surface-alt rounded-[18px_18px_18px_4px] px-4 py-2.5">
                <Loader2 className="text-muted-foreground size-4 animate-spin" aria-hidden />
                <span className="sr-only">Le coach rédige une réponse…</span>
              </div>
            </div>
          )}

          {pendingApprovals.length > 0 && (
            <div
              aria-label="Propositions à valider"
              className="border-primary/30 bg-primary/4 rounded-analysis space-y-2 border p-3"
              role="region"
            >
              <div className="space-y-1">
                <p className="text-primary text-xs font-medium tracking-wide uppercase">
                  {pendingApprovals.length === 1
                    ? '1 proposition à valider'
                    : `${pendingApprovals.length} propositions à valider`}
                </p>
                <p className="text-muted-foreground text-xs">
                  Valide ou refuse la proposition — ou envoie un nouveau message pour l'ignorer et
                  poursuivre la conversation.
                </p>
              </div>
              {pendingApprovals.map((part, i) => (
                <ToolActivity
                  key={part.approval?.id ?? `${part.type}:${i}`}
                  disabled={isBusy}
                  knownSessions={knownSessions}
                  part={part}
                  streamIdle={streamIdle}
                  onApproval={(id, approved) => {
                    // Athlete action unlocks auto-continue for the next approval batch.
                    blockAutoSend.current = false;
                    clearError();
                    addToolApprovalResponse({ id, approved });
                    if (approved) {
                      invalidateAfterCoachToolApproval(queryClient, part.type);
                    }
                  }}
                />
              ))}
            </div>
          )}

          {error && (
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
                Réessayer plus tard
              </Button>
            </div>
          )}
        </div>
      </div>

      <form
        className="border-border/60 flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <Textarea
          aria-label="Message au coach"
          className="max-h-40 min-h-11 resize-y"
          disabled={inputLocked}
          placeholder={inputPlaceholder}
          rows={input.includes('\n') || input.length > 120 ? 6 : 1}
          value={input}
          onChange={(e) => {
            const next = e.target.value;
            setInput(next);
            writeCoachInputDraft(conversationId, next);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
        />
        {isBusy ? (
          <Button
            aria-label="Arrêter la génération"
            className="size-11 shrink-0"
            size="icon"
            type="button"
            variant="outline"
            onClick={() => stop()}
          >
            <Square className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button
            aria-label="Envoyer le message"
            className="size-11 shrink-0"
            disabled={!input.trim()}
            size="icon"
            type="submit"
            variant="highlight"
          >
            <Send className="size-4" aria-hidden />
          </Button>
        )}
      </form>
    </div>
  );
}
