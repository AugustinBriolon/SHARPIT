"use client";

import { ActivityType } from "@prisma/client";
import { MapPin } from "lucide-react";
import { ActivityCharts } from "@/components/training/activity-charts";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RouteMap } from "@/components/training/route-map";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityStream } from "@/hooks/use-data";

function paceFromSpeed(maxSpeed: number): string {
  const sec = 1000 / maxSpeed;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}'${s.toString().padStart(2, "0")}/km`;
}

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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
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

  const { stats, path, samples, has } = data;

  const statCards: { label: string; value: string; sublabel?: string; accent: "cyan" | "orange" | "violet" | "default" }[] = [];
  if (stats?.avgHr)
    statCards.push({
      label: "FC moy.",
      value: `${stats.avgHr}`,
      sublabel: stats.maxHr ? `max ${stats.maxHr} bpm` : "bpm",
      accent: "orange",
    });
  if (stats?.avgWatts)
    statCards.push({
      label: "Puissance moy.",
      value: `${stats.avgWatts} W`,
      sublabel: stats.maxWatts ? `max ${stats.maxWatts} W` : undefined,
      accent: "orange",
    });
  if (stats?.totalAscent != null)
    statCards.push({
      label: "Dénivelé +",
      value: `${stats.totalAscent} m`,
      sublabel:
        stats.minAlt != null && stats.maxAlt != null
          ? `${stats.minAlt}–${stats.maxAlt} m`
          : undefined,
      accent: "violet",
    });
  if (stats?.maxSpeed) {
    if (type === ActivityType.RUN) {
      statCards.push({
        label: "Allure max",
        value: paceFromSpeed(stats.maxSpeed),
        accent: "cyan",
      });
    } else {
      statCards.push({
        label: "Vitesse max",
        value: `${(stats.maxSpeed * 3.6).toFixed(1)} km/h`,
        accent: "cyan",
      });
    }
  }

  return (
    <div className="space-y-6">
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map((c) => (
            <MetricCard
              key={c.label}
              label={c.label}
              value={c.value}
              sublabel={c.sublabel}
              accent={c.accent}
            />
          ))}
        </div>
      )}

      {path && path.length > 1 && (
        <div className="h-80 w-full sm:h-96">
          <RouteMap path={path} />
        </div>
      )}

      <ActivityCharts samples={samples} has={has} type={type} />
    </div>
  );
}
