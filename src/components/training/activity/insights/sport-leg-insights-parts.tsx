'use client';

import type { MultisportLegKind } from '@/lib/multisport';
import type { MultisportLegStream } from '@/lib/streams/streams';
import { formatDistance, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  PerformanceMetrics,
  ThresholdsHint,
} from '@/components/training/activity/insights/performance-metrics';
import { ExpertOnly } from '@/components/display-mode';
import { ActivityInsightsZoneSection } from '@/components/training/activity/insights/activity-insights-zone-section';
import { SplitsTable } from '@/components/training/activity/insights/splits-table';
import type { ZoneBucket } from '@/lib/activity/detail/activity-analysis';
import { sportHeader } from '@/components/training/activity/insights/sport-leg-insights-shared';

export function SportLegHeader({ entry }: { entry: MultisportLegStream }) {
  const header = sportHeader[entry.leg.kind as Exclude<MultisportLegKind, 'transition'>];
  const Icon = header.icon;
  const { leg } = entry;

  return (
    <div className="flex flex-wrap items-start gap-3">
      <span className={cn('grid size-10 place-items-center rounded-xl', header.accent)}>
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-muted-foreground text-sm">{header.description}</p>
        <p className="text-muted-foreground mt-1 font-mono text-xs tabular-nums">
          {leg.distanceM !== null && <span>{formatDistance(leg.distanceM)} · </span>}
          {formatDuration(leg.durationSec)}
          {leg.avgHr !== null && <span> · FC {leg.avgHr}</span>}
        </p>
      </div>
    </div>
  );
}

export function SportLegAnalysis({
  entry,
  analysis,
  hrZones,
  powerZones,
}: {
  entry: MultisportLegStream;
  analysis: NonNullable<MultisportLegStream['stream']['analysis']>;
  hrZones: ZoneBucket[];
  powerZones: ZoneBucket[];
}) {
  return (
    <ExpertOnly>
      <PerformanceMetrics analysis={analysis} />
      {(entry.leg.kind === 'bike' || entry.leg.kind === 'run') && (
        <ThresholdsHint analysis={analysis} />
      )}
      <ActivityInsightsZoneSection
        ftp={analysis.thresholds.ftp}
        hrZones={hrZones}
        includePower={entry.leg.kind === 'bike'}
        lthr={analysis.thresholds.lthr}
        powerZones={powerZones}
      />
    </ExpertOnly>
  );
}

export function SportLegSplits({
  entry,
  analysis,
  runSplits,
  bikeSplits,
}: {
  entry: MultisportLegStream;
  analysis: MultisportLegStream['stream']['analysis'];
  runSplits: NonNullable<NonNullable<MultisportLegStream['stream']['analysis']>['run']>['splits'];
  bikeSplits: NonNullable<NonNullable<MultisportLegStream['stream']['analysis']>['bike']>['splits'];
}) {
  if (entry.leg.kind === 'run' && runSplits.length > 0) {
    return (
      <SplitsTable
        refPaceSecPerKm={analysis?.run?.avgPaceSecPerKm}
        splits={runSplits}
        title="Splits course au kilomètre"
      />
    );
  }
  if (entry.leg.kind === 'bike' && bikeSplits.length > 0) {
    return <SplitsTable mode="bike" splits={bikeSplits} title="Splits vélo tous les 5 km" />;
  }
  return null;
}
