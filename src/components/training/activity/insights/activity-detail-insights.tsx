'use client';

import type { ActivityType } from '@prisma/client';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { ActivityInsightsLoading } from '@/components/training/activity/insights/activity-insights-parts';

const ActivityInsights = dynamic(
  () => import('./activity-insights').then((mod) => mod.ActivityInsights),
  {
    ssr: false,
    loading: () => <ActivityInsightsLoading withCoach withMap />,
  },
);

const TriathlonActivityInsights = dynamic(
  () => import('./triathlon-activity-insights').then((mod) => mod.TriathlonActivityInsights),
  {
    ssr: false,
    loading: () => <ActivityInsightsLoading withCoach={false} withMap={false} />,
  },
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
