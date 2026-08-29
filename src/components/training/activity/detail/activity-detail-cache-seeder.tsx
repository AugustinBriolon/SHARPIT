'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { ActivityDetail } from '@/components/training/activity/detail/types';
import { queryKeys } from '@/lib/query/keys';

/** Seeds the client detail cache from the RSC payload — revisit stays instant. */
export function ActivityDetailCacheSeeder({ activity }: { activity: ActivityDetail }) {
  const queryClient = useQueryClient();
  queryClient.setQueryData(queryKeys.activity(activity.id), activity);
  return null;
}
