import type { GeneratedSession } from '@/hooks/use-coach';
import { generatedSessionPayload } from '@sharpit/app/lib/planned-session/generated-session-payload';

export function buildPlanInsertPayloads(
  sessions: GeneratedSession[],
  selected: Set<number>,
  goalId: string | null,
) {
  return sessions
    .filter((_, index) => selected.has(index))
    .map((session) => generatedSessionPayload(session, goalId));
}

export function preselectGeneratedSessions(
  sessions: GeneratedSession[],
  gateSessions: ReadonlyArray<{ status?: string }>,
) {
  return new Set(
    sessions.map((_, index) => index).filter((index) => gateSessions[index]?.status !== 'REJECTED'),
  );
}
