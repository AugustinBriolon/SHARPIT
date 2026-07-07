import type { TodayState } from '@/hooks/use-today';
import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';

export function snapshotToTodayState(snapshot: AthleteSnapshot): TodayState {
  return {
    reasoning: snapshot.reasoning,
    recovery: snapshot.recovery,
    fatigue: snapshot.fatigue,
    adaptation: snapshot.adaptation,
    dailyStrain: snapshot.dailyStrain,
  };
}

export async function fetchTodayState(
  trainingDayId: string,
  options?: { refresh?: boolean },
): Promise<TodayState> {
  if (options?.refresh) {
    const { refreshAthleteSnapshot } = await import('@/lib/query/athlete-snapshot-fetch');
    const { snapshot } = await refreshAthleteSnapshot(trainingDayId);
    return snapshotToTodayState(snapshot);
  }

  const { fetchAthleteSnapshot } = await import('@/lib/query/athlete-snapshot-fetch');
  const { snapshot } = await fetchAthleteSnapshot(trainingDayId);
  return snapshotToTodayState(snapshot);
}
