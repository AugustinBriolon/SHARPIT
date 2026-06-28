"use client";

import { DateSelector } from "@/components/dashboard/date-selector";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivities, useGoals, useHealthEntries } from "@/hooks/use-data";
import { useMounted } from "@/hooks/use-mounted";
import type { ClientActivity } from "@/lib/client/types";
import { dayActivities, dayHealth } from "@/lib/day";
import {
  activityTypeColors,
  activityTypeLabels,
  formatDistance,
  formatDuration,
} from "@/lib/format";
import { formatSleep } from "@/lib/health";
import { buildReadinessView } from "@/lib/recovery";
import { computeTrainingLoad } from "@/lib/training-load";
import { differenceInCalendarDays, isToday } from "date-fns";
import { useState } from "react";

export function DashboardView() {
  // `mounted` reste false côté serveur et à l'hydratation : on évite ainsi tout
  // décalage d'hydratation lié à l'heure locale (la date n'est rendue qu'ensuite).
  const mounted = useMounted();
  const [date, setDate] = useState<Date>(() => new Date());

  const activitiesQuery = useActivities();
  const healthQuery = useHealthEntries();
  const goalsQuery = useGoals();

  const header = (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Athlete OS
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">Votre journée en un coup d&apos;œil</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {mounted && <DateSelector date={date} onChange={setDate} />}
        <LinkButton href="/training/new">Nouvelle séance</LinkButton>
      </div>
    </header>
  );

  if (
    !mounted ||
    activitiesQuery.isLoading ||
    healthQuery.isLoading ||
    goalsQuery.isLoading
  ) {
    return (
      <div className="space-y-8">
        {header}
        <DashboardSkeleton />
      </div>
    );
  }

  const todayActivities = dayActivities(activitiesQuery.data, date);
  const health = dayHealth(healthQuery.data, date);
  const load = computeTrainingLoad(activitiesQuery.data ?? [], date);

  const upcomingRaces = (goalsQuery.data ?? [])
    .flatMap((g) =>
      g.kind === "RACE" && !g.achieved && g.targetDate != null
        ? [{ goal: g, target: new Date(g.targetDate) }]
        : [],
    )
    .filter(({ target }) => differenceInCalendarDays(target, date) >= 0)
    .sort((a, b) => a.target.getTime() - b.target.getTime());
  const nextRace = upcomingRaces[0]?.goal;
  const daysToRace = upcomingRaces[0]
    ? differenceInCalendarDays(upcomingRaces[0].target, date)
    : null;

  const readiness = buildReadinessView(
    health?.recoveryScore ?? null,
    health?.readinessLevel ?? null,
  );
  const isCurrentDay = isToday(date);

  return (
    <div className="space-y-8">
      {header}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="min-h-44 border-primary/20 bg-linear-to-br from-primary/5 to-transparent lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base font-medium text-muted-foreground">
              <span>
                Séance(s) du jour
              </span>
              {todayActivities.length > 1 && (
                <Badge variant="outline">
                  {todayActivities.length} séances
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayActivities.length > 0 ? (
              <div className="space-y-3">
                {todayActivities.map((activity) => (
                  <ActivityRow key={activity.id} activity={activity} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  {isCurrentDay
                    ? "Pas de séance enregistrée aujourd'hui."
                    : "Aucune séance ce jour-là."}
                </p>
                {isCurrentDay && (
                  <LinkButton href="/training/new" size="sm">
                    Ajouter une séance
                  </LinkButton>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-44">
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">
              Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            {readiness.score != null ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-mono text-4xl font-semibold"
                    style={{ color: readiness.accent }}
                  >
                    {readiness.score}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
                <p
                  className="text-sm font-medium"
                  style={{ color: readiness.accent }}
                >
                  {readiness.levelLabel}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {readiness.recommendation}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Pas de readiness pour ce jour.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Santé du jour
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Sommeil" value={formatSleep(health?.sleepMinutes)} />
          <MetricCard
            label="HRV"
            value={health?.hrv != null ? `${health.hrv} ms` : "—"}
            accent="violet"
          />
          <MetricCard
            label="FC repos"
            value={health?.restingHr != null ? `${health.restingHr} bpm` : "—"}
            accent="orange"
          />
          <MetricCard
            label="Body Battery"
            value={
              health?.bodyBattery != null ? String(health.bodyBattery) : "—"
            }
            accent="cyan"
          />
          <MetricCard
            label="Stress"
            value={health?.stress != null ? String(health.stress) : "—"}
          />
          <MetricCard
            label="Poids"
            value={health?.weightKg != null ? `${health.weightKg} kg` : "—"}
          />
          <MetricCard
            label="Charge 7j"
            value={String(load.weeklyLoad)}
            sublabel={`ACWR ${load.acwr} · ${load.fatigue}`}
            accent="orange"
          />
          <MetricCard
            label="Prochaine course"
            value={daysToRace != null ? `J-${daysToRace}` : "—"}
            sublabel={nextRace?.title ?? "Aucune course"}
          />
        </div>
      </section>
    </div>
  );
}

function ActivityRow({ activity }: { activity: ClientActivity }) {
  const summary = activitySummary(activity);
  return (
    <LinkButton
      href={`/training/${activity.id}`}
      variant="outline"
      className="flex h-auto w-full items-center justify-between px-4 py-3"
    >
      <span className="flex items-center gap-3">
        <Badge variant="outline" className={activityTypeColors[activity.type]}>
          {activityTypeLabels[activity.type]}
        </Badge>
        <span className="font-medium">
          {activity.title ?? activityTypeLabels[activity.type]}
        </span>
      </span>
      <span className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{formatDuration(activity.duration)}</span>
        {summary && <span>· {summary}</span>}
        {activity.load != null && (
          <span className="font-mono text-cyan-400">
            {Math.round(activity.load)} TSS
          </span>
        )}
      </span>
    </LinkButton>
  );
}

function activitySummary(activity: ClientActivity): string | undefined {
  switch (activity.type) {
    case "RUN":
      return activity.runMetrics?.distanceM
        ? formatDistance(activity.runMetrics.distanceM)
        : undefined;
    case "BIKE":
      return activity.bikeMetrics?.tss
        ? `${Math.round(activity.bikeMetrics.tss)} TSS`
        : undefined;
    case "SWIM":
      return activity.swimMetrics?.distanceM
        ? formatDistance(activity.swimMetrics.distanceM)
        : undefined;
    case "STRENGTH":
      return activity.strengthSets.length
        ? `${activity.strengthSets.length} exercices`
        : undefined;
    default:
      return undefined;
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-44 lg:col-span-2" />
        <Skeleton className="h-44" />
      </section>
      <section>
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </section>
    </div>
  );
}
