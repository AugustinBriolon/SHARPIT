import { notFound } from "next/navigation";
import { ActivityInsights } from "@/components/training/activity-insights";
import { DeleteActivityButton } from "@/components/training/activity-list";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  activityTypeLabels,
  formatDate,
  formatDistance,
  formatDuration,
  formatPace,
  formatSwimPace,
} from "@/lib/format";
import { getActivityById } from "@/lib/queries";
import { ActivityType } from "@prisma/client";

type PageProps = { params: Promise<{ id: string }> };

export default async function ActivityDetailPage({ params }: PageProps) {
  const { id } = await params;
  const activity = await getActivityById(id);

  if (!activity) notFound();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{activityTypeLabels[activity.type]}</Badge>
            <p className="text-sm text-muted-foreground">
              {formatDate(new Date(activity.date))}
            </p>
          </div>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
            {activity.title ?? activityTypeLabels[activity.type]}
          </h1>
          <p className="mt-1 font-mono text-cyan-400">
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
      </header>

      {activity.type !== ActivityType.STRENGTH && (
        <ActivityInsights activityId={activity.id} type={activity.type} />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Général</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="RPE" value={activity.rpe} />
            <Row label="Ressenti" value={activity.feeling} />
            <Row label="Météo" value={activity.weather} />
            <Row label="Notes" value={activity.notes} />
          </CardContent>
        </Card>

        {activity.type === ActivityType.RUN && activity.runMetrics && (
          <Card>
            <CardHeader>
              <CardTitle>Course</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Distance" value={formatDistance(activity.runMetrics.distanceM)} />
              <Row label="Dénivelé" value={activity.runMetrics.elevationM ? `${activity.runMetrics.elevationM} m` : null} />
              <Row label="Allure" value={formatPace(activity.runMetrics.paceSecPerKm)} />
              <Row label="FC moy." value={activity.runMetrics.avgHr} />
              <Row label="Cadence" value={activity.runMetrics.cadence} />
              <Row label="Chaussures" value={activity.runMetrics.shoes} />
            </CardContent>
          </Card>
        )}

        {activity.type === ActivityType.BIKE && activity.bikeMetrics && (
          <Card>
            <CardHeader>
              <CardTitle>Vélo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="FTP %" value={activity.bikeMetrics.ftpPercent} />
              <Row label="NP" value={activity.bikeMetrics.normalizedPower ? `${activity.bikeMetrics.normalizedPower} W` : null} />
              <Row label="IF" value={activity.bikeMetrics.intensityFactor} />
              <Row label="TSS" value={activity.bikeMetrics.tss} />
              <Row label="Cadence" value={activity.bikeMetrics.avgCadence} />
              <Row label="Calories" value={activity.bikeMetrics.calories} />
              <Row label="Vélo" value={activity.bikeMetrics.bikeName} />
            </CardContent>
          </Card>
        )}

        {activity.type === ActivityType.SWIM && activity.swimMetrics && (
          <Card>
            <CardHeader>
              <CardTitle>Natation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Distance" value={formatDistance(activity.swimMetrics.distanceM)} />
              <Row label="Séries" value={activity.swimMetrics.sets} />
              <Row label="CSS" value={formatSwimPace(activity.swimMetrics.cssSecPer100m)} />
              <Row label="Allure moy." value={formatSwimPace(activity.swimMetrics.avgPaceSecPer100m)} />
              <Row label="SWOLF" value={activity.swimMetrics.swolf} />
              <Row label="Drills" value={activity.swimMetrics.drills} />
            </CardContent>
          </Card>
        )}

        {activity.type === ActivityType.STRENGTH && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Musculation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activity.strengthSets.map((set) => (
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
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
