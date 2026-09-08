import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { patchPlannedSessionAnalysisInCaches } from '@/lib/query/patch-planned-session-analysis-cache';
import type { ClientActivity, ClientActivityDetail, ClientPlannedSession } from '@/lib/query/types';

export type PlannedSessionAnalysisSnapshot = {
  analysis: ClientPlannedSession['analysis'];
  analyzedAt: ClientPlannedSession['analyzedAt'];
};

function readSessionAnalysis(
  queryClient: QueryClient,
  sessionId: string,
): PlannedSessionAnalysisSnapshot | null {
  const sessions = queryClient.getQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions);
  const fromList = sessions?.find((item) => item.id === sessionId);
  if (fromList) {
    return {
      analysis: fromList.analysis ?? null,
      analyzedAt: fromList.analyzedAt ?? null,
    };
  }

  const activities = queryClient.getQueryData<ClientActivity[]>(queryKeys.activities);
  const fromActivity = activities?.find(
    (activity) => activity.plannedSession?.id === sessionId,
  )?.plannedSession;
  if (fromActivity) {
    return {
      analysis: fromActivity.analysis ?? null,
      analyzedAt: fromActivity.analyzedAt ?? null,
    };
  }

  for (const [, detail] of queryClient.getQueriesData<ClientActivityDetail>({
    queryKey: ['activity'],
  })) {
    if (detail?.plannedSession?.id !== sessionId) {
      continue;
    }
    return {
      analysis: detail.plannedSession.analysis ?? null,
      analyzedAt: detail.plannedSession.analyzedAt ?? null,
    };
  }

  return null;
}

/**
 * Clears conformité analysis across caches so chips / badge enter loading,
 * returning the previous snapshot for rollback on failure.
 */
export function beginPlannedSessionReanalysis(
  queryClient: QueryClient,
  sessionId: string,
): PlannedSessionAnalysisSnapshot | null {
  const previous = readSessionAnalysis(queryClient, sessionId);
  patchPlannedSessionAnalysisInCaches(queryClient, sessionId, {
    analysis: null,
    analyzedAt: null,
  });
  return previous;
}

/** Restores the pre-recalculate analysis after a failed analyze mutation. */
export function rollbackPlannedSessionReanalysis(
  queryClient: QueryClient,
  sessionId: string,
  previous: PlannedSessionAnalysisSnapshot | null,
): void {
  if (!previous) {
    return;
  }
  patchPlannedSessionAnalysisInCaches(queryClient, sessionId, previous);
}
