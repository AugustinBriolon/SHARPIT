'use client';

import { ActivityDetailInstantShell } from '@/components/training/activity/detail/activity-detail-instant-shell';

export function ActivityDetailRouteSkeleton({ activityId }: { activityId?: string }) {
  return <ActivityDetailInstantShell activityId={activityId} />;
}
