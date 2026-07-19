import type { QueryClient } from '@tanstack/react-query';
import {
  fetchPlannedSessionPresentation,
  fetchSessionRationalePresentation,
} from '@/lib/query/presentation-fetchers';
import { queryKeys } from '@/lib/query/keys';

const DETAIL_STALE_MS = 5 * 60 * 1000;

/** Warm both modal presentation queries before / as the dialog opens. */
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
}
