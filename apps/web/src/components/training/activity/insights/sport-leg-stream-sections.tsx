'use client';

import { SportLegMapPanel } from '@/components/training/activity/insights/sport-leg-map-panel';
import {
  SportLegAnalysis,
  SportLegHeader,
  SportLegSplits,
} from '@/components/training/activity/insights/sport-leg-insights-parts';
import type { MultisportLegStream } from '@sharpit/app/lib/streams/stream-types';
import type { ActivityAnalysis } from '@sharpit/app/lib/activity/detail/activity-analysis';

export function SportLegStreamSections({
  entry,
  analysis,
  hrZones,
  powerZones,
  runSplits,
  bikeSplits,
  chart,
}: {
  entry: MultisportLegStream;
  analysis: ActivityAnalysis | null | undefined;
  hrZones: ActivityAnalysis['hr']['zones'];
  powerZones: NonNullable<ActivityAnalysis['power']>['zones'] | [];
  runSplits: NonNullable<ActivityAnalysis['run']>['splits'] | [];
  bikeSplits: NonNullable<ActivityAnalysis['bike']>['splits'] | [];
  chart: React.ReactNode;
}) {
  return (
    <>
      <SportLegHeader entry={entry} />
      <SportLegMapPanel entry={entry} />
      {analysis ? (
        <SportLegAnalysis
          analysis={analysis}
          entry={entry}
          hrZones={hrZones}
          powerZones={powerZones}
        />
      ) : null}
      {chart}
      <SportLegSplits
        analysis={analysis ?? null}
        bikeSplits={bikeSplits}
        entry={entry}
        runSplits={runSplits}
      />
    </>
  );
}
