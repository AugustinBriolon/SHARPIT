import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';

/** Today + Plan surfaces that mirror planned-session mutations for the current athlete. */
function invalidateTodayAndPlan(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.presentationTodayAll });
  void queryClient.invalidateQueries({ queryKey: ['today'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.trainingPlan });
}

/**
 * Invalidate caches that coach calendar / memory tools may have mutated.
 * Planned sessions plus Today/Plan so brick demotion and session edits refresh athlete views.
 */
export function invalidateAfterCoachTools(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });
  invalidateTodayAndPlan(queryClient);
  void queryClient.invalidateQueries({ queryKey: queryKeys.travelContext });
  void queryClient.invalidateQueries({ queryKey: queryKeys.coachMemory });
}

/** After a coach turn that may have touched sessions: refresh list + Today/Plan. */
export function invalidatePlannedSessionsAfterCoachTurn(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });
  invalidateTodayAndPlan(queryClient);
}

/**
 * After athlete approves a coach tool: always refresh planned sessions + Today/Plan;
 * travel/memory tools also refresh travel + coach memory.
 */
export function invalidateAfterCoachToolApproval(queryClient: QueryClient, toolType: string): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });
  invalidateTodayAndPlan(queryClient);
  if (toolType === 'tool-setTravelContext' || toolType === 'tool-setTrainingConstraint') {
    void queryClient.invalidateQueries({ queryKey: queryKeys.travelContext });
    void queryClient.invalidateQueries({ queryKey: queryKeys.coachMemory });
  }
}
