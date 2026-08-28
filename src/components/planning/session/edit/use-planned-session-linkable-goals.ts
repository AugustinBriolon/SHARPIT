import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { useMemo } from 'react';

export function usePlannedSessionLinkableGoals(
  goals: ClientGoal[],
  session?: ClientPlannedSession | null,
) {
  return useMemo(() => {
    const now = new Date();
    const dated = goals.filter(
      (g) => !g.achieved && g.targetDate && new Date(g.targetDate as unknown as string) >= now,
    );
    const linked = session?.goalId ? goals.find((g) => g.id === session.goalId) : null;
    if (linked && !dated.some((g) => g.id === linked.id)) {
      return [linked, ...dated];
    }
    return dated;
  }, [goals, session]);
}
