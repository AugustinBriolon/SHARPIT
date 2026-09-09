import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { patchPlannedSessionAnalysisInCaches } from '@/lib/query/patch-planned-session-analysis-cache';
import type { ClientActivity, ClientActivityDetail, ClientPlannedSession } from '@/lib/query/types';

export type PlannedSessionAnalysisSnapshot = {
  analysis: ClientPlannedSession['analysis'];
  analyzedAt: ClientPlannedSession['analyzedAt'];
};

function snapshotFromPlannedSession(
  session: Pick<ClientPlannedSession, 'analysis' | 'analyzedAt'>,
): PlannedSessionAnalysisSnapshot {
  return {
    analysis: session.analysis ?? null,
    analyzedAt: session.analyzedAt ?? null,
  };
}

function readFromPlannedSessionsList(
  queryClient: QueryClient,
  sessionId: string,
): PlannedSessionAnalysisSnapshot | null {
  const sessions = queryClient.getQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions);
  const match = sessions?.find((item) => item.id === sessionId);
  return match ? snapshotFromPlannedSession(match) : null;
}

function readFromActivitiesList(
  queryClient: QueryClient,
  sessionId: string,
): PlannedSessionAnalysisSnapshot | null {
  const activities = queryClient.getQueryData<ClientActivity[]>(queryKeys.activities);
  const plannedSession = activities?.find(
    (activity) => activity.plannedSession?.id === sessionId,
  )?.plannedSession;
  return plannedSession ? snapshotFromPlannedSession(plannedSession) : null;
}

function readFromActivityDetails(
  queryClient: QueryClient,
  sessionId: string,
): PlannedSessionAnalysisSnapshot | null {
  for (const [, detail] of queryClient.getQueriesData<ClientActivityDetail>({
    queryKey: ['activity'],
  })) {
    if (detail?.plannedSession?.id !== sessionId) {
      continue;
    }
    return snapshotFromPlannedSession(detail.plannedSession);
  }
  return null;
}

function readSessionAnalysis(
  queryClient: QueryClient,
  sessionId: string,
): PlannedSessionAnalysisSnapshot | null {
  return (
    readFromPlannedSessionsList(queryClient, sessionId) ??
    readFromActivitiesList(queryClient, sessionId) ??
    readFromActivityDetails(queryClient, sessionId)
  );
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
