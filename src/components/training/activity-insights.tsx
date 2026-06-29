"use client";

import { ActivityType } from "@prisma/client";
import { MapPin } from "lucide-react";
import { ActivityCharts } from "@/components/training/activity-charts";
import { CombinedChart } from "@/components/training/combined-chart";
import {
  PerformanceMetrics,
  ThresholdsHint,
} from "@/components/training/performance-metrics";
import { RouteMap } from "@/components/training/route-map";
import { SplitsTable } from "@/components/training/splits-table";
import { ZoneDistribution } from "@/components/training/zone-distribution";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityStream } from "@/hooks/use-data";
import type { ZoneBucket } from "@/lib/activity-analysis";
import { cn } from "@/lib/utils";

export function ActivityInsights({
  activityId,
  type,
}: {
  activityId: string;
  type: ActivityType;
}) {
  const { data, isLoading, isError } = useActivityStream(activityId);

  if (isLoading) {
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
        <CardContent className="py-6 text-sm text-muted-foreground">
          Données détaillées indisponibles pour le moment (Strava non connecté ou
          quota atteint). Réessaie plus tard.
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.available) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <MapPin className="size-4" />
          Pas de données GPS ni de capteurs pour cette séance.
        </CardContent>
      </Card>
    );
  }

  const { path, samples, has, analysis } = data;
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
            hrZones={hrZones}
            powerZones={powerZones}
            lthr={analysis.thresholds.lthr}
            ftp={analysis.thresholds.ftp}
          />
        </>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Profils
        </h2>
        <CombinedChart samples={samples} has={has} type={type} />
        <ActivityCharts samples={samples} has={has} type={type} />
      </section>

      {runSplits.length > 0 && (
        <SplitsTable
          title="Splits au kilomètre"
          splits={runSplits}
          refPaceSecPerKm={analysis?.run?.avgPaceSecPerKm}
        />
      )}

      {bikeSplits.length > 0 && (
        <SplitsTable title="Splits tous les 5 km" splits={bikeSplits} mode="bike" />
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
        title="Zones fréquence cardiaque"
        subtitle={lthr ? `Réf. LTHR ${lthr} bpm` : undefined}
        zones={hrZones}
      />,
    );
  }
  if (powerZones.some((z) => z.seconds > 0)) {
    blocks.push(
      <ZoneDistribution
        key="power"
        title="Zones de puissance"
        subtitle={ftp ? `Réf. FTP ${ftp} W` : undefined}
        zones={powerZones}
      />,
    );
  }

  if (blocks.length === 0) return null;
  return (
    <div className={cn("grid gap-4", blocks.length > 1 && "lg:grid-cols-2")}>
      {blocks}
    </div>
  );
}
