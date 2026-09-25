import type { QueryClient } from '@tanstack/react-query';
import { fetchActivity, fetchActivityStream } from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';
import { ActivityType } from '@prisma/client';

const PREFETCH_STALE_MS = 10 * 60_000;

/** Warm activity detail + GPS streams before navigation (list hover / intent). */
export function prefetchActivityDetail(
  queryClient: QueryClient,
  activityId: string,
  type?: ActivityType,
): void {
  void queryClient.prefetchQuery({
    queryKey: queryKeys.activity(activityId),
    queryFn: () => fetchActivity(activityId),
    staleTime: PREFETCH_STALE_MS,
  });

  if (type === ActivityType.STRENGTH || type === ActivityType.TRIATHLON) {
    return;
  }

  void queryClient.prefetchQuery({
    queryKey: queryKeys.activityStream(activityId),
    queryFn: () => fetchActivityStream(activityId),
    staleTime: Infinity,
  });
}
