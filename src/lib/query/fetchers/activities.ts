import type { ClientActivity, ClientActivityDetail } from '../types';
import { fetchJson, type Serialized, toDate, toDateOrNull } from './shared';

export async function fetchActivities(): Promise<ClientActivity[]> {
  const data = await fetchJson<Serialized<ClientActivity>[]>('/api/activities');
  return data.map((a) => ({
    ...a,
    date: toDate(a.date),
    createdAt: toDate(a.createdAt),
    updatedAt: toDate(a.updatedAt),
    plannedSession: a.plannedSession
      ? {
          ...a.plannedSession,
          date: toDate(a.plannedSession.date),
          analyzedAt: toDateOrNull(a.plannedSession.analyzedAt),
        }
      : null,
  }));
}

function hydrateActivityDetail(
  a: Serialized<ClientActivityDetail> | ClientActivityDetail,
): ClientActivityDetail {
  return {
    ...a,
    date: toDate(a.date as string | Date),
    createdAt: toDate(a.createdAt as string | Date),
    updatedAt: toDate(a.updatedAt as string | Date),
    narrativeAnalyzedAt: toDateOrNull(a.narrativeAnalyzedAt as string | Date | null),
    plannedSession: a.plannedSession
      ? {
          ...a.plannedSession,
          date: toDate(a.plannedSession.date as string | Date),
          analyzedAt: toDateOrNull(a.plannedSession.analyzedAt as string | Date | null),
        }
      : null,
  } as ClientActivityDetail;
}

export async function fetchActivity(id: string): Promise<ClientActivityDetail> {
  const data = await fetchJson<Serialized<ClientActivityDetail>>(
    `/api/activities/${encodeURIComponent(id)}`,
  );
  return hydrateActivityDetail(data);
}

/** Soft poll helper — returns null on HTTP error (narrative polling). */
export async function fetchActivityNarrativeFields(id: string): Promise<{
  narrativeAnalysis?: unknown;
  narrativeAnalyzedAt?: string | null;
} | null> {
  try {
    const data = await fetchJson<{
      narrativeAnalysis?: unknown;
      narrativeAnalyzedAt?: string | null;
    }>(`/api/activities/${encodeURIComponent(id)}`);
    return {
      narrativeAnalysis: data.narrativeAnalysis,
      narrativeAnalyzedAt: data.narrativeAnalyzedAt ?? null,
    };
  } catch {
    return null;
  }
}

export async function postActivityNarrative(
  activityId: string,
  body: { force?: boolean; wait?: boolean } = { force: true, wait: true },
): Promise<{
  ok: boolean;
  narrativeAnalysis?: unknown;
  narrativeAnalyzedAt?: string | null;
  error?: string;
}> {
  const res = await fetch(`/api/activities/${encodeURIComponent(activityId)}/narrative`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as {
    narrativeAnalysis?: unknown;
    narrativeAnalyzedAt?: string | null;
    error?: string;
  } | null;
  if (!res.ok) {
    return { ok: false, error: data?.error ?? 'Synthèse impossible' };
  }
  return {
    ok: true,
    narrativeAnalysis: data?.narrativeAnalysis,
    narrativeAnalyzedAt: data?.narrativeAnalyzedAt ?? null,
  };
}

export async function postActivityWeatherPreview(
  body: unknown,
  options?: { signal?: AbortSignal },
): Promise<{ weather?: string | null; summary?: string | null } | null> {
  try {
    const res = await fetch('/api/activities/weather-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options?.signal,
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as { weather?: string | null; summary?: string | null };
  } catch {
    return null;
  }
}
