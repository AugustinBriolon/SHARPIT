import type { QueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { queryKeys } from '@/lib/query/keys';

/**
 * Soft-invalidate client caches after athlete-profile PATCH succeeds.
 * Pair with `router.refresh()` so Server Component `initial` props re-fetch
 * (otherwise leave/re-enter settings can show the previous RSC snapshot).
 */
export async function invalidateAfterAthleteProfileSave(
  queryClient: QueryClient,
  options?: { trainingDayId?: string },
): Promise<void> {
  const trainingDayId = options?.trainingDayId ?? format(new Date(), 'yyyy-MM-dd');

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.athleteProfile }),
    queryClient.invalidateQueries({ queryKey: queryKeys.thresholdPreview }),
    queryClient.invalidateQueries({ queryKey: queryKeys.thresholdHistory }),
    queryClient.invalidateQueries({ queryKey: ['activity-stream'] }),
    queryClient.invalidateQueries({ queryKey: ['presentation'] }),
    queryClient.invalidateQueries({ queryKey: ['athlete-snapshot'] }),
    queryClient.invalidateQueries({ queryKey: ['today'] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.athleteSnapshot(trainingDayId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.presentationToday(trainingDayId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.today(trainingDayId) }),
  ]);
}
