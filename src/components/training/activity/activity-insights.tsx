'use client';

import { ActivityType } from '@prisma/client';
import { MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';
import { type ReactNode, useMemo } from 'react';
import {
  PerformanceMetrics,
  ThresholdsHint,
} from '@/components/training/activity/performance-metrics';
import { MemoizedRouteMap as RouteMap } from '@/components/training/activity/route-map';
import { SplitsTable } from '@/components/training/activity/splits-table';
import { ZoneDistribution } from '@/components/training/activity/zone-distribution';
import { Card, CardContent } from '@/components/ui/card';
import { useActivityStream } from '@/hooks/use-data';
import { sportIdentityHex } from '@/lib/activity/sport-identity';
import type { ZoneBucket } from '@/lib/activity/activity-analysis';
import { normalizeStreamChartData } from '@/lib/streams/stream-chart-data';
import { cn } from '@/lib/utils';
import {
  ActivityCompositionSkeleton,
  ActivityPerformanceSkeleton,
} from '@/components/training/activity/detail/activity-detail-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard } from '@/components/ui/skeleton-patterns';

const ActivityStreamChart = dynamic(
  () =>
    import('@/components/training/activity/activity-stream-chart').then(
      (mod) => mod.ActivityStreamChart,
    ),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);

/**
 * Endurance detail body: parcours | lecture coach (+ zones), then splits / profiles.
 * Sport hue is reserved for the map polyline — chrome stays neutral.
 */
export function ActivityInsights({
  activityId,
  type,
  coachPanel,
  expectMap = true,
}: {
  activityId: string;
  type: ActivityType;
  /** Coach reading — sits beside the route on large screens. */
  coachPanel?: ReactNode;
  /**
   * Whether a route map is likely (outdoor RUN/BIKE, open-water SWIM).
   * Pool swim / indoor sessions load coach-only until a path actually arrives.
   */
  expectMap?: boolean;
}) {
  const { data, isPending, isError } = useActivityStream(activityId);
  const routeColor = sportIdentityHex(type);
  const normalizedSamples = useMemo(
    () => (data?.available && data.samples ? normalizeStreamChartData(data.samples) : []),
    [data],
  );

  if (isPending) {
    return (
      <div className="space-y-8">
        <ActivityCompositionSkeleton withCoach={Boolean(coachPanel)} withMap={expectMap} />
        <ActivityPerformanceSkeleton />
        <section className="space-y-4">
          <p className="text-label">Profils</p>
          <SkeletonCard className="min-h-56 px-5 py-5">
            <Skeleton className="rounded-analysis h-48 w-full border-0" />
          </SkeletonCard>
        </section>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        {coachPanel}
        <Card>
          <CardContent className="text-muted-foreground py-6 text-sm">
            Données détaillées indisponibles pour le moment (pas de trace GPS ni capteurs sur cette
            séance, ou synchronisation Garmin en cours). Réessaie plus tard.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || !data.available) {
    return (
      <div className="space-y-6">
        {coachPanel}
        <Card>
          <CardContent className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
            <MapPin className="size-4" />
            Pas de données GPS ni de capteurs pour cette séance.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { path, has, analysis } = data;
  const hrZones = analysis?.hr.zones ?? [];
  const powerZones = analysis?.power?.zones ?? [];
  const runSplits = analysis?.run?.splits ?? [];
  const bikeSplits = analysis?.bike?.splits ?? [];
  const hasPath = Boolean(path && path.length > 1);
  const showComposition = hasPath || coachPanel;

  return (
    <div className="space-y-8">
      {showComposition ? (
        <div
          className={cn('grid gap-4', hasPath && coachPanel && 'lg:grid-cols-2 lg:items-stretch')}
        >
          {/* Mobile: coach first. Desktop: map left, coach right. */}
          {coachPanel ? (
            <div className="order-1 flex min-h-0 flex-col gap-4 lg:order-2">
              {coachPanel}
              {analysis ? (
                <ZoneSection
                  ftp={analysis.thresholds.ftp}
                  hrZones={hrZones}
                  lthr={analysis.thresholds.lthr}
                  powerZones={powerZones}
                  compact
                />
              ) : null}
            </div>
          ) : null}

          {hasPath && path ? (
            <div className="order-2 h-80 w-full overflow-hidden rounded-xl sm:h-96 lg:order-1 lg:min-h-full">
              <RouteMap key={`${activityId}-${type}`} lineColor={routeColor} path={path} />
            </div>
          ) : null}
        </div>
      ) : null}

      {analysis && (
        <>
          <PerformanceMetrics analysis={analysis} />
          <ThresholdsHint analysis={analysis} />
          {!coachPanel ? (
            <ZoneSection
              ftp={analysis.thresholds.ftp}
              hrZones={hrZones}
              lthr={analysis.thresholds.lthr}
              powerZones={powerZones}
            />
          ) : null}
        </>
      )}

      <ActivityStreamChart has={has} samples={normalizedSamples} type={type} />

      {runSplits.length > 0 && (
        <SplitsTable
          refPaceSecPerKm={analysis?.run?.avgPaceSecPerKm}
          splits={runSplits}
          title="Splits au kilomètre"
        />
      )}

      {bikeSplits.length > 0 && (
        <SplitsTable mode="bike" splits={bikeSplits} title="Splits tous les 5 km" />
      )}
    </div>
  );
}

/**
 * Affiche les distributions de zones disponibles. N'occupe deux colonnes que si
 * FC ET puissance existent — sinon la carte unique prend toute la largeur, pour
 * éviter une demi-colonne vide (typique de la course à pied, sans puissance).
 */
function ZoneSection({
  hrZones,
  powerZones,
  lthr,
  ftp,
  compact = false,
}: {
  hrZones: ZoneBucket[];
  powerZones: ZoneBucket[];
  lthr: number | null;
  ftp: number | null;
  compact?: boolean;
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
  if (powerZones.some((z) => z.seconds > 0)) {
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
  return (
    <div
      className={cn(
        'grid gap-4',
        !compact && blocks.length > 1 && 'lg:grid-cols-2',
        compact && 'bg-analysis-surface-alt rounded-analysis-lg px-4 py-4',
      )}
    >
      {blocks}
    </div>
  );
}
