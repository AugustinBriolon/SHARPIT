'use client';

import { ActivityType } from '@prisma/client';
import { MapPin } from 'lucide-react';
import { useMemo } from 'react';
import { ActivityCharts } from '@/components/training/activity-charts';
import { CombinedChart } from '@/components/training/combined-chart';
import { PerformanceMetrics, ThresholdsHint } from '@/components/training/performance-metrics';
import { MemoizedRouteMap as RouteMap } from '@/components/training/route-map';
import { SplitsTable } from '@/components/training/splits-table';
import { ZoneDistribution } from '@/components/training/zone-distribution';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivityStream } from '@/hooks/use-data';
import type { ZoneBucket } from '@/lib/activity-analysis';
import { normalizeStreamChartData } from '@/lib/stream-chart-data';
import { cn } from '@/lib/utils';

export function ActivityInsights({ activityId, type }: { activityId: string; type: ActivityType }) {
  const { data, isPending, isError } = useActivityStream(activityId);
  const normalizedSamples = useMemo(
    () => (data?.available && data.samples ? normalizeStreamChartData(data.samples) : []),
    [data],
  );

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-80 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-6 text-sm">
          Données détaillées indisponibles pour le moment (pas de trace GPS ni capteurs sur cette
          séance, ou synchronisation Garmin en cours). Réessaie plus tard.
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.available) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
          <MapPin className="size-4" />
          Pas de données GPS ni de capteurs pour cette séance.
        </CardContent>
      </Card>
    );
  }

  const { path, has, analysis } = data;
  const hrZones = analysis?.hr.zones ?? [];
  const powerZones = analysis?.power?.zones ?? [];
  const runSplits = analysis?.run?.splits ?? [];
  const bikeSplits = analysis?.bike?.splits ?? [];

  return (
    <div className="space-y-8">
      {path && path.length > 1 && (
        <div className="h-80 w-full sm:h-96">
          <RouteMap path={path} />
        </div>
      )}

      {analysis && (
        <>
          <PerformanceMetrics analysis={analysis} />
          <ThresholdsHint analysis={analysis} />

          <ZoneSection
            ftp={analysis.thresholds.ftp}
            hrZones={hrZones}
            lthr={analysis.thresholds.lthr}
            powerZones={powerZones}
          />
        </>
      )}

      <section className="space-y-4">
        <h2 className="text-label">Profils</h2>
        <CombinedChart has={has} samples={normalizedSamples} type={type} />
        <ActivityCharts has={has} samples={normalizedSamples} type={type} />
      </section>

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
}: {
  hrZones: ZoneBucket[];
  powerZones: ZoneBucket[];
  lthr: number | null;
  ftp: number | null;
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
  return <div className={cn('grid gap-4', blocks.length > 1 && 'lg:grid-cols-2')}>{blocks}</div>;
}
