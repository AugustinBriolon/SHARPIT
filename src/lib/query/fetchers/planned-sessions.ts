import type { ClientPlannedSession } from '../types';
import { fetchJson, type Serialized, toDate, toDateOrNull } from './shared';

/** Rehydrate planned-session JSON (API / mutation responses) into client Date shapes. */
export function hydratePlannedSession(
  s: Serialized<ClientPlannedSession> | ClientPlannedSession,
): ClientPlannedSession {
  return {
    ...s,
    date: toDate(s.date as string | Date),
    createdAt: toDate(s.createdAt as string | Date),
    updatedAt: toDate(s.updatedAt as string | Date),
    analyzedAt: toDateOrNull(s.analyzedAt as string | Date | null),
    environmentContextAt: toDateOrNull(s.environmentContextAt as string | Date | null),
    activity: s.activity
      ? {
          ...s.activity,
          date: toDate(s.activity.date as string | Date),
          createdAt: toDate(s.activity.createdAt as string | Date),
          updatedAt: toDate(s.activity.updatedAt as string | Date),
          narrativeAnalyzedAt: toDateOrNull(s.activity.narrativeAnalyzedAt as string | Date | null),
          plannedSession: s.activity.plannedSession
            ? {
                ...s.activity.plannedSession,
                date: toDate(s.activity.plannedSession.date as string | Date),
                analyzedAt: toDateOrNull(
                  s.activity.plannedSession.analyzedAt as string | Date | null,
                ),
              }
            : null,
        }
      : null,
  } as ClientPlannedSession;
}

export async function fetchPlannedSessions(): Promise<ClientPlannedSession[]> {
  const data = await fetchJson<Serialized<ClientPlannedSession>[]>('/api/planned-sessions');
  return data.map((s) => hydratePlannedSession(s));
}

export async function fetchPlannedSessionById(id: string): Promise<ClientPlannedSession> {
  const data = await fetchJson<Serialized<ClientPlannedSession>>(
    `/api/planned-sessions/${encodeURIComponent(id)}`,
  );
  return hydratePlannedSession(data);
}
