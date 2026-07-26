'use client';

import { useParams } from 'next/navigation';
import { ActivityDetailSkeleton } from '@/components/training/activity/detail/activity-detail-skeleton';
import { useActivities } from '@/hooks/use-data';
import {
  resolveActivityDetailSkeletonLayout,
  type ActivityDetailSkeletonLayout,
} from '@/lib/activity/activity-detail-skeleton-layout';

/**
 * Route loading shell — picks map / strength / no-map from the activities
 * cache when available (usual navigation from /training). Defaults to map
 * (course / vélo) when the type is still unknown.
 */
export function ActivityDetailRouteSkeleton() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : null;
  const { data: activities } = useActivities();

  let layout: ActivityDetailSkeletonLayout = 'map';
  if (id && activities) {
    const cached = activities.find((activity) => activity.id === id);
    if (cached) {
      layout = resolveActivityDetailSkeletonLayout({
        type: cached.type,
        title: cached.title,
        notes: cached.notes,
      });
    }
  }

  return <ActivityDetailSkeleton layout={layout} />;
}
