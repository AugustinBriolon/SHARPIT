import type {
  AdaptationData,
  FatigueData,
  ReasoningData,
  RecoveryData,
  TodayState,
} from '@/hooks/use-today';

async function fetchEngine<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function fetchTodayState(
  trainingDayId: string,
  options?: { refresh?: boolean },
): Promise<TodayState> {
  const refreshParam = options?.refresh ? '&refresh=true' : '';
  const base = `trainingDayId=${trainingDayId}&athleteId=default${refreshParam}`;

  const [recovery, fatigue, adaptation] = await Promise.all([
    fetchEngine<RecoveryData>(`/api/recovery?${base}`),
    fetchEngine<FatigueData>(`/api/fatigue?${base}`),
    fetchEngine<AdaptationData>(`/api/adaptation?${base}`),
  ]);

  const reasoning = await fetchEngine<ReasoningData>(`/api/reasoning?${base}`);

  if (!reasoning && !recovery && !fatigue && !adaptation) {
    throw new Error('Impossible de charger ton bilan du jour. Réessaie.');
  }

  return { reasoning, recovery, fatigue, adaptation };
}
