'use client';

import type { ActivityType } from '@prisma/client';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const ActivityInsights = dynamic(
  () =>
    import('@/components/training/activity/activity-insights').then((mod) => mod.ActivityInsights),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);

const TriathlonActivityInsights = dynamic(
  () =>
    import('@/components/training/activity/triathlon-activity-insights').then(
      (mod) => mod.TriathlonActivityInsights,
    ),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);

/**
 * Client boundary for activity detail insights — keeps `next/dynamic` + `ssr: false`
 * out of the Server Component page.
 */
export function ActivityDetailInsights({
  activityId,
  type,
  isTriathlon,
  coachPanel,
  expectMap,
}: {
  activityId: string;
  type: ActivityType;
  isTriathlon: boolean;
  coachPanel?: ReactNode;
  expectMap?: boolean;
}) {
  if (isTriathlon) {
    return <TriathlonActivityInsights activityId={activityId} />;
  }

  return (
    <ActivityInsights
      activityId={activityId}
      coachPanel={coachPanel}
      expectMap={expectMap}
      type={type}
    />
  );
}
