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
