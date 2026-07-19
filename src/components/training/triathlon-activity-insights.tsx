'use client';

import { ActivityType } from '@prisma/client';
import { Bike, Footprints, MapPin, Waves } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ActivityCharts } from '@/components/training/activity-charts';
import { CombinedChart } from '@/components/training/combined-chart';
import { PerformanceMetrics, ThresholdsHint } from '@/components/training/performance-metrics';
import { MemoizedRouteMap as RouteMap } from '@/components/training/route-map';
import { SplitsTable } from '@/components/training/splits-table';
import { ZoneDistribution } from '@/components/training/zone-distribution';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMultisportStreams } from '@/hooks/use-data';
import type { ZoneBucket } from '@/lib/activity-analysis';
import { formatDistance, formatDuration } from '@/lib/format';
import type { MultisportLegKind } from '@/lib/multisport';
import { normalizeStreamChartData } from '@/lib/stream-chart-data';
import type { MultisportLegStream, ActivityStreamPayload } from '@/lib/streams';
import { cn } from '@/lib/utils';

const sportHeader: Record<
  Exclude<MultisportLegKind, 'transition'>,
  { icon: typeof Waves; accent: string; description: string }
> = {
  swim: {
    icon: Waves,
    accent: 'text-blue-600 bg-blue-500/10',
    description: 'Fréquence cardiaque et rythme en eau libre',
  },
  bike: {
    icon: Bike,
    accent: 'text-emerald-600 bg-emerald-500/10',
    description: 'Puissance, dénivelé et zones d’effort',
  },
  run: {
    icon: Footprints,
    accent: 'text-orange-600 bg-orange-500/10',
    description: 'Allure, splits et réponse cardiovasculaire',
  },
};

function legKey(entry: MultisportLegStream): string {
  return entry.leg.garminActivityId ?? entry.leg.kind;
}

function ZoneSection({
  hrZones,
  powerZones,
  lthr,
  ftp,
  type,
}: {
  hrZones: ZoneBucket[];
  powerZones: ZoneBucket[];
  lthr: number | null;
  ftp: number | null;
  type: ActivityType;
}) {
  const blocks: React.ReactNode[] = [];
  if (hrZones.some((z) => z.seconds > 0)) {
    blocks.push(
      <ZoneDistribution
        key="hr"
        subtitle={lthr ? `Réf. LTHR ${lthr} bpm` : undefined}
        title="Zones fréquence cardiaque"
        zones={hrZones}
      />,
    );
  }
  if (type === ActivityType.BIKE && powerZones.some((z) => z.seconds > 0)) {
    blocks.push(
      <ZoneDistribution
        key="power"
        subtitle={ftp ? `Réf. FTP ${ftp} W` : undefined}
        title="Zones de puissance"
        zones={powerZones}
      />,
    );
  }

  if (blocks.length === 0) return null;
  return <div className={cn('grid gap-4', blocks.length > 1 && 'lg:grid-cols-2')}>{blocks}</div>;
}

function shouldShowCombinedLegChart(
  kind: MultisportLegKind,
  has: ActivityStreamPayload['has'],
): boolean {
  if (kind === 'bike') return has.watts && has.hr;
  if (kind === 'run') return has.altitude && has.hr;
  return false;
}

function SportLegInsights({ entry }: { entry: MultisportLegStream }) {
  const { leg, type, stream } = entry;
  const header = sportHeader[leg.kind as Exclude<MultisportLegKind, 'transition'>];
  const Icon = header.icon;

  const normalizedSamples = useMemo(
    () => (stream.available && stream.samples ? normalizeStreamChartData(stream.samples) : []),
    [stream],
  );

  if (!stream.available) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
          <MapPin className="size-4" />
          Pas de capteurs détaillés pour {leg.label.toLowerCase()}.
        </CardContent>
      </Card>
    );
  }

  const { path, has, analysis } = stream;
  const hrZones = analysis?.hr.zones ?? [];
  const powerZones = analysis?.power?.zones ?? [];
  const runSplits = analysis?.run?.splits ?? [];
  const bikeSplits = analysis?.bike?.splits ?? [];

  const showMap = path != null && path.length > 1;
  const showCombined = shouldShowCombinedLegChart(leg.kind, has);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <span className={cn('grid size-10 place-items-center rounded-xl', header.accent)}>
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-muted-foreground text-sm">{header.description}</p>
          <p className="text-muted-foreground mt-1 font-mono text-xs tabular-nums">
            {leg.distanceM != null && <span>{formatDistance(leg.distanceM)} · </span>}
            {formatDuration(leg.durationSec)}
            {leg.avgHr != null && <span> · FC {leg.avgHr}</span>}
          </p>
        </div>
      </div>

      {showMap && (
        <div className="h-72 w-full sm:h-80">
          <RouteMap lineColor={leg.kind === 'swim' ? '#2563eb' : undefined} path={path} />
        </div>
      )}

      {analysis && (
        <>
          <PerformanceMetrics analysis={analysis} />
          {(leg.kind === 'bike' || leg.kind === 'run') && <ThresholdsHint analysis={analysis} />}
          <ZoneSection
            ftp={analysis.thresholds.ftp}
            hrZones={hrZones}
            lthr={analysis.thresholds.lthr}
            powerZones={powerZones}
            type={type}
          />
        </>
      )}

      <div className="space-y-4">
        {showCombined && <CombinedChart has={has} samples={normalizedSamples} type={type} />}
        <ActivityCharts has={has} samples={normalizedSamples} type={type} />
      </div>

      {leg.kind === 'run' && runSplits.length > 0 && (
        <SplitsTable
          refPaceSecPerKm={analysis?.run?.avgPaceSecPerKm}
          splits={runSplits}
          title="Splits course au kilomètre"
        />
      )}

      {leg.kind === 'bike' && bikeSplits.length > 0 && (
        <SplitsTable mode="bike" splits={bikeSplits} title="Splits vélo tous les 5 km" />
      )}
    </div>
  );
}

function SportLegSelector({
  legs,
  selectedKey,
  onSelect,
}: {
  legs: MultisportLegStream[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="bg-muted/40 inline-flex flex-wrap gap-1 rounded-full border p-1">
      {legs.map((entry) => {
        const key = legKey(entry);
        const active = key === selectedKey;
        const Icon = sportHeader[entry.leg.kind as Exclude<MultisportLegKind, 'transition'>].icon;
        return (
          <button
            key={key}
            aria-pressed={active}
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onSelect(key)}
          >
            <Icon className="size-3.5 shrink-0 opacity-80" />
            {entry.leg.label}
          </button>
        );
      })}
    </div>
  );
}

export function TriathlonActivityInsights({ activityId }: { activityId: string }) {
  const { data, isPending, isError } = useMultisportStreams(activityId);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const legs = data?.legs ?? [];

  useEffect(() => {
    if (legs.length === 0) return;
    setSelectedKey((current) => {
      if (current && legs.some((entry) => legKey(entry) === current)) return current;
      return legKey(legs[0]);
    });
  }, [legs]);

  const selectedEntry = useMemo(
    () => legs.find((entry) => legKey(entry) === selectedKey) ?? legs[0] ?? null,
    [legs, selectedKey],
  );

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-56 rounded-full" />
        </div>
        <Skeleton className="h-72 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || legs.length === 0 || !selectedEntry) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-6 text-sm">
          Données détaillées par sport indisponibles (synchronisation Garmin en cours ou activité
          sans jambes enregistrées).
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-label">Analyse par sport</p>
        <SportLegSelector
          legs={legs}
          selectedKey={legKey(selectedEntry)}
          onSelect={setSelectedKey}
        />
      </div>

      <SportLegInsights key={legKey(selectedEntry)} entry={selectedEntry} />
    </section>
  );
}
