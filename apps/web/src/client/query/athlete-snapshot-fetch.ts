import type { AthleteSnapshot } from '@sharpit/server/athlete-state/snapshot';
import { apiFetch } from '@/client/query/api-fetch';

export async function fetchAthleteSnapshot(
  trainingDayId: string,
): Promise<{ snapshot: AthleteSnapshot; isRefreshing: boolean }> {
  const url = `/api/athlete-state/snapshot?trainingDayId=${trainingDayId}`;
  const res = await apiFetch(url);
  if (!res.ok) {
    throw new Error('Impossible de charger ton état. Réessaie.');
  }
  return res.json() as Promise<{ snapshot: AthleteSnapshot; isRefreshing: boolean }>;
}

export async function refreshAthleteSnapshot(
  trainingDayId: string,
): Promise<{ snapshot: AthleteSnapshot; isRefreshing: boolean }> {
  const res = await apiFetch(
    `/api/athlete-state/refresh?trainingDayId=${trainingDayId}&forceSync=true`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'today_refresh' }),
    },
  );
  if (!res.ok) {
    throw new Error('Impossible de mettre à jour ton état. Réessaie.');
  }
  const data = (await res.json()) as { athleteSnapshot: AthleteSnapshot };
  return { snapshot: data.athleteSnapshot, isRefreshing: false };
}
