'use client';

import { useChat } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from 'ai';
import { Loader2, Send, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Markdown } from '@/components/coach/markdown';
import { ToolActivity, type KnownSession } from '@/components/coach/tool-activity';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSaveConversation } from '@/hooks/use-coach';
import { queryKeys } from '@/lib/query/keys';

const SUGGESTIONS = [
  "Comment se présente ma forme aujourd'hui ?",
  'Quelle séance me conseilles-tu pour demain ?',
  'Décale ma séance de seuil à après-demain',
  'Ajoute une sortie vélo endurance samedi',
];

type ToolPartLite = {
  type: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  approval?: { id: string; isAutomatic?: boolean };
};

const CALENDAR_TOOL_TYPES = new Set([
  'tool-createPlannedSession',
  'tool-createBrickSession',
  'tool-updatePlannedSession',
  'tool-deletePlannedSession',
]);

function buildKnownSessions(toolParts: ToolPartLite[]): Record<string, KnownSession> {
  const known: Record<string, KnownSession> = {};
  for (const part of toolParts) {
    if (part.type === 'tool-listPlannedSessions' && Array.isArray(part.output)) {
      for (const s of part.output as KnownSession[]) {
        if (s?.id) known[s.id] = s;
      }
    }
  }
  return known;
}

export function CoachChat({
  conversationId,
  initialMessages,
  bootstrapPrompt,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
  bootstrapPrompt?: string;
}) {
  const queryClient = useQueryClient();
  const { mutateAsync: saveMessages } = useSaveConversation();

  const { messages, sendMessage, status, stop, error, addToolApprovalResponse } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: '/api/coach/chat' }),
    // Quand l'athlète valide/refuse une proposition, on renvoie automatiquement
    // sa décision au serveur pour exécuter (ou non) l'action.
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
    const changed = messages.some(
      (m) =>
        m.role === 'assistant' &&
        m.parts.some((p) => {
          if (!p.type.startsWith('tool-')) return false;
          const part = p as ToolPartLite;
          return (
            CALENDAR_TOOL_TYPES.has(part.type) &&
            part.state === 'output-available' &&
            (part.output as { ok?: boolean } | undefined)?.ok !== false
          );
        }),
    );
    if (changed) {
      queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });
    }
  }, [messages, queryClient]);

  function submit(text: string) {
    const value = text.trim();
    if (!value || isBusy) return;
    sendMessage({ text: value });
    setInput('');
  }

  // Toutes les propositions en attente de validation, affichées en bas du chat.
  const pendingApprovals: { part: ToolPartLite; known: Record<string, KnownSession> }[] = [];
  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    const toolParts = message.parts.filter((p) => p.type.startsWith('tool-')) as ToolPartLite[];
    const known = buildKnownSessions(toolParts);
    for (const part of toolParts) {
      if (part.state === 'approval-requested' && part.approval && !part.approval.isAutomatic) {
        pendingApprovals.push({ part, known });
      }
    }
  }

  return (
    <div className="border-border/60 bg-card/30 flex h-full min-h-[80vh] min-w-0 flex-1 flex-col rounded-xl border">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-muted-foreground max-w-sm text-sm">
              Pose une question à ton coach. Il connaît ta forme, ta récupération, tes seuils et tes
              objectifs.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground rounded-full border px-3 py-1.5 text-xs transition-colors"
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

          // Les propositions en attente de validation sont rendues en bas de la
          // discussion, pas ici. On n'affiche inline que le texte + les statuts.
          const inlineParts = toolParts.filter(
            (p) => (p as ToolPartLite).state !== 'approval-requested',
          );

          if (!text && inlineParts.length === 0) return null;

          return (
            <div key={message.id} className="flex justify-start">
              <div className="bg-muted/60 text-foreground w-full max-w-[90%] space-y-2 rounded-2xl px-4 py-3">
                {text && <Markdown>{text}</Markdown>}
                {inlineParts.map((part, i) => (
                  <ToolActivity key={i} part={part} />
                ))}
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
            <p className="text-primary text-xs font-medium tracking-wide uppercase">
              {pendingApprovals.length === 1
                ? '1 proposition à valider'
                : `${pendingApprovals.length} propositions à valider`}
            </p>
            {pendingApprovals.map(({ part, known }, i) => (
              <ToolActivity
                key={i}
                disabled={isBusy}
                knownSessions={known}
                part={part}
                onApproval={(id, approved) => {
                  addToolApprovalResponse({ id, approved });
                  if (approved) {
                    queryClient.invalidateQueries({
                      queryKey: queryKeys.plannedSessions,
                    });
                  }
                }}
              />
            ))}
          </div>
        )}

        {error && (
          <p className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            Une erreur est survenue. Vérifie que la clé AI_GATEWAY_API_KEY est configurée, puis
            réessaie.
          </p>
        )}
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
          disabled={isBusy}
          placeholder="Demande conseil à ton coach…"
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
