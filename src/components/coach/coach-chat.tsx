"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from "ai";
import { Loader2, Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/coach/markdown";
import { ToolActivity, type KnownSession } from "@/components/coach/tool-activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSaveConversation } from "@/hooks/use-coach";
import { queryKeys } from "@/lib/client/keys";

const SUGGESTIONS = [
  "Comment se présente ma forme aujourd'hui ?",
  "Quelle séance me conseilles-tu pour demain ?",
  "Décale ma séance de seuil à après-demain",
  "Ajoute une sortie vélo endurance samedi",
];

type ToolPartLite = {
  type: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  approval?: { id: string; isAutomatic?: boolean };
};

const CALENDAR_TOOL_TYPES = new Set([
  "tool-createPlannedSession",
  "tool-createBrickSession",
  "tool-updatePlannedSession",
  "tool-deletePlannedSession",
]);

function buildKnownSessions(
  toolParts: ToolPartLite[],
): Record<string, KnownSession> {
  const known: Record<string, KnownSession> = {};
  for (const part of toolParts) {
    if (
      part.type === "tool-listPlannedSessions" &&
      Array.isArray(part.output)
    ) {
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
}: {
  conversationId: string;
  initialMessages: UIMessage[];
}) {
  const queryClient = useQueryClient();
  const { mutateAsync: saveMessages } = useSaveConversation();

  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    addToolApprovalResponse,
  } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/coach/chat" }),
  // Quand l'athlète valide/refuse une proposition, on renvoie automatiquement
  // sa décision au serveur pour exécuter (ou non) l'action.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: ({ messages: all, isAbort, isError, isDisconnect }) => {
      if (isAbort || isError || isDisconnect) return;
      saveMessages({ id: conversationId, messages: all }).catch((err) =>
        console.error("[coach-chat] save", err),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });
    },
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const changed = messages.some(
      (m) =>
        m.role === "assistant" &&
        m.parts.some((p) => {
          if (!p.type.startsWith("tool-")) return false;
          const part = p as ToolPartLite;
          return (
            CALENDAR_TOOL_TYPES.has(part.type) &&
            part.state === "output-available" &&
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
    setInput("");
  }

  // Toutes les propositions en attente de validation, affichées en bas du chat.
  const pendingApprovals: { part: ToolPartLite; known: Record<string, KnownSession> }[] =
    [];
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const toolParts = message.parts.filter((p) =>
      p.type.startsWith("tool-"),
    ) as ToolPartLite[];
    const known = buildKnownSessions(toolParts);
    for (const part of toolParts) {
      if (
        part.state === "approval-requested" &&
        part.approval &&
        !part.approval.isAutomatic
      ) {
        pendingApprovals.push({ part, known });
      }
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-border/60 bg-card/30">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">
              Pose une question à ton coach. Il connaît ta forme, ta
              récupération, tes seuils et tes objectifs.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === "user";
          const text = message.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { text: string }).text)
            .join("");
          const toolParts = message.parts.filter((p) =>
            p.type.startsWith("tool-"),
          );

          if (isUser) {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  {text}
                </div>
              </div>
            );
          }

          // Les propositions en attente de validation sont rendues en bas de la
          // discussion, pas ici. On n'affiche inline que le texte + les statuts.
          const inlineParts = toolParts.filter(
            (p) => (p as ToolPartLite).state !== "approval-requested",
          );

          if (!text && inlineParts.length === 0) return null;

          return (
            <div key={message.id} className="flex justify-start">
              <div className="w-full max-w-[90%] space-y-2 rounded-2xl bg-muted/60 px-4 py-3 text-foreground">
                {text && <Markdown>{text}</Markdown>}
                {inlineParts.map((part, i) => (
                  <ToolActivity key={i} part={part} />
                ))}
              </div>
            </div>
          );
        })}

        {status === "submitted" && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted/60 px-4 py-2.5">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {pendingApprovals.length > 0 && (
          <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/4 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {pendingApprovals.length === 1
                ? "1 proposition à valider"
                : `${pendingApprovals.length} propositions à valider`}
            </p>
            {pendingApprovals.map(({ part, known }, i) => (
              <ToolActivity
                key={i}
                part={part}
                knownSessions={known}
                disabled={isBusy}
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
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Une erreur est survenue. Vérifie que la clé AI_GATEWAY_API_KEY est
            configurée, puis réessaie.
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex items-center gap-2 border-t border-border/60 p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Demande conseil à ton coach…"
          disabled={isBusy}
        />
        {isBusy ? (
          <Button type="button" variant="outline" size="icon" onClick={() => stop()}>
            <Square className="size-4" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="size-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
