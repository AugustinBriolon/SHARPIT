import { notFound } from "next/navigation";
import {
  ActivityHeroStats,
  type HeroActivity,
} from "@/components/training/activity-hero-stats";
import { ActivityInsights } from "@/components/training/activity-insights";
import { DeleteActivityButton } from "@/components/training/activity-list";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  activityTypeLabels,
  formatDate,
  formatDuration,
} from "@/lib/format";
import { getActivityById } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { ActivityType } from "@prisma/client";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

type Accent = "cyan" | "orange" | "violet" | "emerald" | "default";
type Stat = { label: string; value: string; accent: Accent };
type Detail = { label: string; value: string | number };

type Activity = NonNullable<Awaited<ReturnType<typeof getActivityById>>>;

const accentText: Record<Accent, string> = {
  cyan: "text-cyan-600",
  orange: "text-orange-600",
  violet: "text-violet-600",
  emerald: "text-emerald-600",
  default: "text-foreground",
};

export default async function ActivityDetailPage({ params }: PageProps) {
  const { id } = await params;
  const activity = await getActivityById(id);

  if (!activity) notFound();

  const heroActivity: HeroActivity = {
    type: activity.type,
    duration: activity.duration,
    runMetrics: activity.runMetrics
      ? {
          distanceM: activity.runMetrics.distanceM,
          paceSecPerKm: activity.runMetrics.paceSecPerKm,
          avgHr: activity.runMetrics.avgHr,
          cadence: activity.runMetrics.cadence,
        }
      : null,
    bikeMetrics: activity.bikeMetrics
      ? { elevationM: activity.bikeMetrics.elevationM }
      : null,
    swimMetrics: activity.swimMetrics
      ? {
          distanceM: activity.swimMetrics.distanceM,
          avgPaceSecPer100m: activity.swimMetrics.avgPaceSecPer100m,
        }
      : null,
  };

  const strengthStats = buildStrengthStats(activity);
  const details = buildDetails(activity);

  return (
    <div className="space-y-8">
      <header className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">
                {activityTypeLabels[activity.type]}
              </Badge>
              <p className="text-sm text-muted-foreground">
                {formatDate(new Date(activity.date))}
              </p>
            </div>
            <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
              {activity.title ?? activityTypeLabels[activity.type]}
            </h1>
            <p className="mt-1 font-mono text-cyan-600">
              {formatDuration(activity.duration)}
              {activity.load != null && ` · ${Math.round(activity.load)} TSS`}
            </p>
          </div>
          <div className="flex gap-2">
            <LinkButton href={`/training/${activity.id}/edit`} variant="outline">
              Modifier
            </LinkButton>
            <DeleteActivityButton id={activity.id} />
          </div>
        </div>

        {activity.type === ActivityType.STRENGTH ? (
          strengthStats.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {strengthStats.map((stat) => (
                <HeroStat key={stat.label} {...stat} />
              ))}
            </div>
          )
        ) : (
          <ActivityHeroStats activityId={activity.id} activity={heroActivity} />
        )}
      </header>

      {activity.type !== ActivityType.STRENGTH && (
        <ActivityInsights activityId={activity.id} type={activity.type} />
      )}

      {activity.type === ActivityType.STRENGTH && (
        <Card>
          <CardHeader>
            <CardTitle>Exercices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.strengthSets.length > 0 ? (
              activity.strengthSets.map((set) => (
                <div
                  key={set.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-4 py-3 text-sm"
                >
                  <span className="font-medium">{set.exercise}</span>
                  <span className="font-mono text-muted-foreground">
                    {set.sets}×{set.reps}
                    {set.weightKg ? ` @ ${set.weightKg} kg` : ""}
                    {set.rpe ? ` · RPE ${set.rpe}` : ""}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun exercice enregistré pour cette séance.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {details.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">
              Détails
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {details.map((row) => (
              <div
                key={row.label}
                className="flex justify-between gap-4 border-b border-border/40 py-1.5 last:border-0"
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-right">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HeroStat({ label, value, accent }: Stat) {
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 font-mono text-3xl font-semibold tabular-nums",
          accentText[accent],
        )}
      >
        {value}
      </p>
    </div>
  );
}

function buildStrengthStats(activity: Activity): Stat[] {
  if (activity.type !== ActivityType.STRENGTH) return [];
  const sets = activity.strengthSets;
  if (sets.length === 0) return [];

  const totalSets = sets.reduce((acc, s) => acc + s.sets, 0);
  const volume = sets.reduce(
    (acc, s) => acc + s.sets * s.reps * (s.weightKg ?? 0),
    0,
  );

  const stats: Stat[] = [
    { label: "Exercices", value: String(sets.length), accent: "cyan" },
    { label: "Séries", value: String(totalSets), accent: "violet" },
  ];
  if (volume > 0)
    stats.push({
      label: "Volume",
      value: `${Math.round(volume)} kg`,
      accent: "orange",
    });

  return stats;
}

function buildDetails(activity: Activity): Detail[] {
  const details: Detail[] = [];
  const push = (label: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === "") return;
    details.push({ label, value });
  };

  if (activity.type === ActivityType.RUN && activity.runMetrics) {
    const m = activity.runMetrics;
    push("Dénivelé", m.elevationM != null ? `${m.elevationM} m` : null);
    push(
      "Puissance moy.",
      m.avgPower != null ? `${Math.round(m.avgPower)} W` : null,
    );
    push("Chaussures", m.shoes);
  }

  if (activity.type === ActivityType.BIKE && activity.bikeMetrics) {
    const m = activity.bikeMetrics;
    push("FTP %", m.ftpPercent);
    push(
      "NP",
      m.normalizedPower != null ? `${Math.round(m.normalizedPower)} W` : null,
    );
    push("IF", m.intensityFactor != null ? m.intensityFactor.toFixed(2) : null);
    push("TSS", m.tss != null ? Math.round(m.tss) : null);
    push("Cadence", m.avgCadence != null ? `${m.avgCadence} rpm` : null);
    push("Calories", m.calories);
    push("Vélo", m.bikeName);
  }

  if (activity.type === ActivityType.SWIM && activity.swimMetrics) {
    const m = activity.swimMetrics;
    push("Séries", m.sets);
    push(
      "CSS",
      m.cssSecPer100m != null
        ? `${Math.floor(m.cssSecPer100m / 60)}:${String(
            Math.round(m.cssSecPer100m % 60),
          ).padStart(2, "0")}/100m`
        : null,
    );
    push("SWOLF", m.swolf);
    push("Drills", m.drills);
  }

  push("RPE", activity.rpe);
  push("Ressenti", activity.feeling);
  push("Météo", activity.weather);
  push("Notes", activity.notes);

  return details;
}
