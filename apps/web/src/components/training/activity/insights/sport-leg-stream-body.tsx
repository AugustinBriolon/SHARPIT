'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { SportLegStreamSections } from '@/components/training/activity/insights/sport-leg-stream-sections';
import { deriveSportLegStreamData } from '@/components/training/activity/insights/sport-leg-stream-data';
import type { MultisportLegStream } from '@/lib/streams/streams';
import { normalizeStreamChartData } from '@/lib/streams/stream-chart-data';

const ActivityStreamChart = dynamic(
  () => import('./activity-stream-chart').then((mod) => mod.ActivityStreamChart),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);

export function SportLegStreamBody({ entry }: { entry: MultisportLegStream }) {
  const { stream } = entry;
  const normalizedSamples = useMemo(
    () => (stream.samples ? normalizeStreamChartData(stream.samples) : []),
    [stream.samples],
  );
  const streamData = deriveSportLegStreamData(stream);

  const chart = (
    <div className="space-y-4">
      <ActivityStreamChart has={streamData.has} samples={normalizedSamples} type={entry.type} />
    </div>
  );

  return (
    <div className="space-y-5">
      <SportLegStreamSections
        analysis={streamData.analysis}
        bikeSplits={streamData.bikeSplits}
        chart={chart}
        entry={entry}
        hrZones={streamData.hrZones}
        powerZones={streamData.powerZones}
        runSplits={streamData.runSplits}
      />
    </div>
  );
}
