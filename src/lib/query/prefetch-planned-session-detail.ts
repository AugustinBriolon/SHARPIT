import type { QueryClient } from '@tanstack/react-query';
import {
  fetchPlannedSessionPresentation,
  fetchSessionRationalePresentation,
} from '@/lib/query/presentation-fetchers';
import { fetchPlannedSessionById } from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';
import { seedPlannedSessionIntoCache } from '@/lib/query/seed-planned-session-cache';
import type { ClientPlannedSession } from '@/lib/query/types';

const DETAIL_STALE_MS = 5 * 60 * 1000;

function warmPlannedSessionListEntry(queryClient: QueryClient, sessionId: string): void {
  const list = queryClient.getQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions);
  if (list?.some((item) => item.id === sessionId)) {
    return;
  }
  void fetchPlannedSessionById(sessionId)
    .then((session) => {
      seedPlannedSessionIntoCache(queryClient, session);
    })
    .catch(() => undefined);
}

/** Warm modal presentation queries and seed the list cache when the session is missing. */
export function prefetchPlannedSessionDetail(queryClient: QueryClient, sessionId: string): void {
  void queryClient.prefetchQuery({
    queryKey: queryKeys.plannedSessionPresentation(sessionId),
    queryFn: () => fetchPlannedSessionPresentation(sessionId),
    staleTime: DETAIL_STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: queryKeys.sessionRationale(sessionId),
    queryFn: () => fetchSessionRationalePresentation(sessionId),
    staleTime: DETAIL_STALE_MS,
  });
  warmPlannedSessionListEntry(queryClient, sessionId);
}
