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
      const { output } = part as ToolPartLite;
      if (!Array.isArray(output)) {
        continue;
      }
      for (const s of output as KnownSession[]) {
        if (s?.id) {
          known[s.id] = s;
        }
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
