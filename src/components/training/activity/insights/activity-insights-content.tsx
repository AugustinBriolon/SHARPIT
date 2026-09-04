'use client';

import { ExpertOnly } from '@/components/display-mode';
import {
  PerformanceMetrics,
  ThresholdsHint,
} from '@/components/training/activity/insights/performance-metrics';
import {
  RunSplitsSection,
  BikeSplitsSection,
} from '@/components/training/activity/insights/activity-insights-splits';
import { ActivityInsightsZoneSection } from '@/components/training/activity/insights/activity-insights-zone-section';
import type { ActivityType } from '@prisma/client';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { ActivityAnalysis } from '@/lib/activity/detail/activity-analysis';
import { normalizeStreamChartData } from '@/lib/streams/stream-chart-data';
import { useMemo } from 'react';

const ActivityStreamChart = dynamic(
  () => import('./activity-stream-chart').then((mod) => mod.ActivityStreamChart),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);

function ActivityInsightsAnalysis({
  analysis,
  coachPanel,
  hrZones,
  powerZones,
  has,
  normalizedSamples,
  type,
}: {
  analysis: ActivityAnalysis;
  coachPanel?: ReactNode;
  hrZones: ActivityAnalysis['hr']['zones'];
  powerZones: NonNullable<ActivityAnalysis['power']>['zones'] | [];
  has: StreamPayload['has'];
  normalizedSamples: ReturnType<typeof normalizeStreamChartData>;
  type: ActivityType;
}) {
  return (
    <>
      <ExpertOnly>
        <PerformanceMetrics analysis={analysis} />
        <ThresholdsHint analysis={analysis} />
        {!coachPanel ? (
          <ActivityInsightsZoneSection
            ftp={analysis.thresholds.ftp}
            hrZones={hrZones}
            lthr={analysis.thresholds.lthr}
            powerZones={powerZones}
          />
        ) : null}
      </ExpertOnly>
      <ActivityStreamChart has={has} samples={normalizedSamples} type={type} />
    </>
  );
}

function ActivityInsightsSplits({ analysis }: { analysis: ActivityAnalysis | null | undefined }) {
  return (
    <>
      <RunSplitsSection analysis={analysis} />
      <BikeSplitsSection analysis={analysis} />
    </>
  );
}

type StreamPayload = NonNullable<
  Awaited<ReturnType<typeof import('@/hooks/use-data').useActivityStream>>['data']
>;

export function ActivityInsightsContent({
  activityId: _activityId,
  type,
  coachPanel,
  data,
  composition,
}: {
  activityId: string;
  type: ActivityType;
  coachPanel?: ReactNode;
  data: StreamPayload;
  composition: ReactNode;
}) {
  const normalizedSamples = useMemo(
    () => (data.samples ? normalizeStreamChartData(data.samples) : []),
    [data.samples],
  );

  const { has, analysis } = data;
  const hrZones = analysis?.hr.zones ?? [];
  const powerZones = analysis?.power?.zones ?? [];

  return (
    <div className="space-y-8">
      {composition}

      {analysis ? (
        <ActivityInsightsAnalysis
          analysis={analysis}
          coachPanel={coachPanel}
          has={has}
          hrZones={hrZones}
          normalizedSamples={normalizedSamples}
          powerZones={powerZones}
          type={type}
        />
      ) : (
        <ActivityStreamChart has={has} samples={normalizedSamples} type={type} />
      )}

      <ActivityInsightsSplits analysis={analysis} />
    </div>
  );
}
