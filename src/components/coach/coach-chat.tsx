'use client';

import { useChat } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from 'ai';
import { Loader2, Send, Square } from 'lucide-react';
import { format } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CoachMessage } from '@/components/coach/coach-message';
import { ToolActivityList } from '@/components/coach/tool-activity-list';
import { ToolActivity, type KnownSession } from '@/components/coach/tool-activity';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSaveConversation, useCreateConversation } from '@/hooks/use-coach';
import { usePlannedSessions } from '@/hooks/use-data';
import {
  CALENDAR_MUTATION_TOOL_TYPES,
  dismissUnresolvedCalendarTools,
  hasUnresolvedCalendarTools,
  type ToolPartLite,
} from '@/lib/coach-tool-parts';
import { queryKeys } from '@/lib/query/keys';
import { ActivityType } from '@prisma/client';

const SUGGESTIONS = [
  "Comment se présente ma forme aujourd'hui ?",
  'Quelle séance me conseilles-tu pour demain ?',
  'Décale ma séance de seuil à après-demain',
  'Ajoute une sortie vélo endurance samedi',
];

function buildKnownSessions(
  messages: UIMessage[],
  plannedSessions:
    { id: string; title: string | null; date: Date; type: ActivityType }[] | undefined,
): Record<string, KnownSession> {
  const known: Record<string, KnownSession> = {};

  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    for (const part of message.parts) {
      if (part.type !== 'tool-listPlannedSessions') continue;
      const { output } = part as ToolPartLite;
      if (!Array.isArray(output)) continue;
      for (const s of output as KnownSession[]) {
        if (s?.id) known[s.id] = s;
      }
    }
  }

  for (const session of plannedSessions ?? []) {
    known[session.id] = {
      id: session.id,
      title: session.title,
      date: format(new Date(session.date), 'yyyy-MM-dd'),
      type: session.type,
    };
  }

  return known;
}

export function CoachChat({
  conversationId,
  initialMessages,
  bootstrapPrompt,
  isEphemeral = false,
  autoReply = false,
  header,
  onConversationCreated,
  onAutoReplyStarted,
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
}) {
  const queryClient = useQueryClient();
  const { mutateAsync: saveMessages } = useSaveConversation();
  const createConversation = useCreateConversation();
  const { data: plannedSessions } = usePlannedSessions();
  const autoReplyStarted = useRef(false);
  const invalidatedToolPartKeys = useRef<Set<string>>(new Set());

  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    addToolApprovalResponse,
    setMessages,
    regenerate,
  } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: '/api/coach/chat' }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: ({ messages: all, isAbort, isError, isDisconnect }) => {
      if (isAbort || isError || isDisconnect) return;
      saveMessages({ id: conversationId, messages: all }).catch((err) =>
        console.error('[coach-chat] save', err),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });
    },
  });
  const [input, setInput] = useState('');
  const prefilled = useRef(false);

  useEffect(() => {
    if (!bootstrapPrompt || prefilled.current || initialMessages.length > 0) return;
    setInput(bootstrapPrompt);
    prefilled.current = true;
  }, [bootstrapPrompt, initialMessages.length]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);

  const isBusy = status === 'submitted' || status === 'streaming';
  const streamIdle = !isBusy;

  useEffect(() => {
    autoReplyStarted.current = false;
  }, [conversationId]);

  useEffect(() => {
    if (!autoReply || autoReplyStarted.current || isBusy) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'user') return;
    autoReplyStarted.current = true;
    void regenerate().finally(() => onAutoReplyStarted?.());
  }, [autoReply, isBusy, messages, onAutoReplyStarted, regenerate]);

  const knownSessions = useMemo(
    () => buildKnownSessions(messages, plannedSessions),
    [messages, plannedSessions],
  );

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
      queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.travelContext });
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachMemory });
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
        id: crypto.randomUUID(),
        role: 'user',
        parts: [{ type: 'text', text: value }],
      };
      try {
        const conversation = await createConversation.mutateAsync({ messages: [userMessage] });
        onConversationCreated?.(conversation.id);
      } catch (err) {
        console.error('[coach-chat] create', err);
        return;
      }
      setInput('');
      return;
    }

    sendMessage({ text: value });
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
    <div className="lg:border-border/60 lg:bg-card/30 flex h-full min-w-0 flex-1 flex-col rounded-xl lg:border">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {header && (
          <div className="bg-background/85 supports-backdrop-filter:bg-background/70 sticky top-0 z-10 backdrop-blur-md">
            {header}
          </div>
        )}
        <div className="space-y-4 p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <p className="text-muted-foreground max-w-sm text-sm">
                Pose une question à ton coach. Il connaît ta forme, ta récupération, tes seuils et
                tes objectifs.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground rounded-full border px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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

          {messages.map((message) => {
            const isUser = message.role === 'user';
            const text = message.parts
              .filter((p) => p.type === 'text')
              .map((p) => (p as { text: string }).text)
              .join('');
            const toolParts = message.parts.filter((p) => p.type.startsWith('tool-'));

            if (isUser) {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap">
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
              <div key={message.id} className="flex justify-start">
                <div className="bg-muted/60 text-foreground w-full max-w-[90%] space-y-2 rounded-2xl px-4 py-3">
                  {text && <CoachMessage>{text}</CoachMessage>}
                  <ToolActivityList parts={inlineParts as ToolPartLite[]} streamIdle={streamIdle} />
                </div>
              </div>
            );
          })}

          {status === 'submitted' && (
            <div className="flex justify-start">
              <div className="bg-muted/60 rounded-2xl px-4 py-2.5">
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
              </div>
            </div>
          )}

          {pendingApprovals.length > 0 && (
            <div className="border-primary/30 bg-primary/4 space-y-2 rounded-xl border p-3">
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
                  key={i}
                  disabled={isBusy}
                  knownSessions={knownSessions}
                  part={part}
                  streamIdle={streamIdle}
                  onApproval={(id, approved) => {
                    addToolApprovalResponse({ id, approved });
                    if (approved) {
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.plannedSessions,
                      });
                      if (part.type === 'tool-setTravelContext') {
                        void queryClient.invalidateQueries({ queryKey: queryKeys.travelContext });
                        void queryClient.invalidateQueries({ queryKey: queryKeys.coachMemory });
                      }
                    }
                  }}
                />
              ))}
            </div>
          )}

          {error && (
            <p className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {coachErrorMessage}
            </p>
          )}
        </div>
      </div>

      <form
        className="border-border/60 flex items-center gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <Textarea
          className="max-h-40 min-h-10 resize-y"
          disabled={inputLocked}
          placeholder={inputPlaceholder}
          rows={bootstrapPrompt ? 6 : 1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
        />
        {isBusy ? (
          <Button size="icon" type="button" variant="outline" onClick={() => stop()}>
            <Square className="size-4" />
          </Button>
        ) : (
          <Button disabled={!input.trim()} size="icon" type="submit">
            <Send className="size-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
