import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { seedPlannedSessionIntoCache } from '@/lib/query/seed-planned-session-cache';

type AnalysisPatch = {
  analysis: ClientPlannedSession['analysis'];
  analyzedAt: ClientPlannedSession['analyzedAt'];
};

function patchSessionAnalysis(
  session: ClientPlannedSession,
  patch: AnalysisPatch,
): ClientPlannedSession {
  return {
    ...session,
    analysis: patch.analysis,
    analyzedAt: patch.analyzedAt,
  } as ClientPlannedSession;
}

function patchNestedPlannedSession(
  activity: ClientActivity,
  sessionId: string,
  patch: AnalysisPatch,
): ClientActivity {
  if (!activity.plannedSession || activity.plannedSession.id !== sessionId) {
    return activity;
  }
  return {
    ...activity,
    plannedSession: {
      ...activity.plannedSession,
      analysis: patch.analysis,
      analyzedAt: patch.analyzedAt,
    },
  } as ClientActivity;
}

/** Keep planned-session analysis in sync across list, modal, and activity detail chips. */
export function patchPlannedSessionAnalysisInCaches(
  queryClient: QueryClient,
  sessionId: string,
  patch: AnalysisPatch,
): void {
  queryClient.setQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions, (prev) => {
    if (!prev) {
      return prev;
    }
    return prev.map((session) =>
      session.id === sessionId ? patchSessionAnalysis(session, patch) : session,
    );
  });

  queryClient.setQueryData<ClientActivity[]>(queryKeys.activities, (prev) => {
    if (!prev) {
      return prev;
    }
    return prev.map((activity) => patchNestedPlannedSession(activity, sessionId, patch));
  });

  seedPlannedSessionIntoCache(queryClient, {
    id: sessionId,
    analysis: patch.analysis,
    analyzedAt: patch.analyzedAt,
  });
}
