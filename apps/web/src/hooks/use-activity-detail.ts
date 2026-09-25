'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchActivity } from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';
import type { ClientActivityDetail } from '@/lib/query/types';

const ACTIVITY_DETAIL_STALE_MS = 10 * 60_000;

export function useActivityDetail(id: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.activity(id ?? ''),
    queryFn: () => fetchActivity(id!),
    enabled: Boolean(id),
    staleTime: ACTIVITY_DETAIL_STALE_MS,
    gcTime: 60 * 60_000,
    placeholderData: () =>
      id ? queryClient.getQueryData<ClientActivityDetail>(queryKeys.activity(id)) : undefined,
  });
}
