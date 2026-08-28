import type { ReactNode } from 'react';
import type { ActivityType } from '@prisma/client';
import { ActivityInsightsComposition } from '@/components/training/activity/insights/activity-insights-composition';
import { streamCompositionProps } from '@/components/training/activity/insights/activity-insights-stream-props';

type StreamPayload = NonNullable<
  Awaited<ReturnType<typeof import('@/hooks/use-data').useActivityStream>>['data']
>;

export function buildActivityInsightsComposition({
  activityId,
  type,
  coachPanel,
  data,
}: {
  activityId: string;
  type: ActivityType;
  coachPanel?: ReactNode;
  data: StreamPayload;
}): ReactNode {
  const props = streamCompositionProps(data, type);
  return (
    <ActivityInsightsComposition
      activityId={activityId}
      coachPanel={coachPanel}
      {...props}
      type={type}
    />
  );
}
