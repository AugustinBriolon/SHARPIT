import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';

/**
 * Invalidate caches that coach calendar / memory tools may have mutated.
 * Same key set as the historical coach-chat cascade — preserve behavior.
 */
export function invalidateAfterCoachTools(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });
  void queryClient.invalidateQueries({ queryKey: queryKeys.travelContext });
  void queryClient.invalidateQueries({ queryKey: queryKeys.coachMemory });
}

/** Planned sessions only — used when a chat turn finishes without tool-specific cascade. */
export function invalidatePlannedSessionsAfterCoachTurn(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });
}

/**
 * After athlete approves a coach tool: always refresh planned sessions;
 * travel/memory tools also refresh travel + coach memory.
 */
export function invalidateAfterCoachToolApproval(queryClient: QueryClient, toolType: string): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });
  if (toolType === 'tool-setTravelContext' || toolType === 'tool-setTrainingConstraint') {
    void queryClient.invalidateQueries({ queryKey: queryKeys.travelContext });
    void queryClient.invalidateQueries({ queryKey: queryKeys.coachMemory });
  }
}
