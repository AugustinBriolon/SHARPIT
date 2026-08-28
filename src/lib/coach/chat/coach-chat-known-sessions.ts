import type { UIMessage } from 'ai';
import { format } from 'date-fns';
import type { KnownSession } from '@/components/coach/chat/tool-activity';
import type { ToolPartLite } from '@/lib/coach/chat/coach-tool-parts';
import type { ActivityType } from '@prisma/client';

export const COACH_CHAT_SUGGESTIONS = [
  "Comment se présente ma forme aujourd'hui ?",
  'Quelle séance me conseilles-tu pour demain ?',
  'Décale ma séance de seuil à après-demain',
  'Ajoute une sortie vélo endurance samedi',
] as const;

function ingestToolSessions(part: ToolPartLite, known: Record<string, KnownSession>): void {
  const { output } = part;
  if (!Array.isArray(output)) {
    return;
  }
  for (const session of output as KnownSession[]) {
    if (session?.id) {
      known[session.id] = session;
    }
  }
}

function ingestPlannedSessions(
  plannedSessions: { id: string; title: string | null; date: Date; type: ActivityType }[],
  known: Record<string, KnownSession>,
): void {
  for (const session of plannedSessions) {
    known[session.id] = {
      id: session.id,
      title: session.title,
      date: format(new Date(session.date), 'yyyy-MM-dd'),
      type: session.type,
    };
  }
}

export function buildKnownSessions(
  messages: UIMessage[],
  plannedSessions:
    { id: string; title: string | null; date: Date; type: ActivityType }[] | undefined,
): Record<string, KnownSession> {
  const known: Record<string, KnownSession> = {};

  for (const message of messages) {
    if (message.role !== 'assistant') {
      continue;
    }
    for (const part of message.parts) {
      if (part.type !== 'tool-listPlannedSessions') {
        continue;
      }
      ingestToolSessions(part as ToolPartLite, known);
    }
  }

  if (plannedSessions) {
    ingestPlannedSessions(plannedSessions, known);
  }

  return known;
}
