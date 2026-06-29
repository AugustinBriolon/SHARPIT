"use client";

import { AlertsBanner } from "@/components/dashboard/alerts-banner";
import { BriefingCard } from "@/components/dashboard/briefing-card";
import { WeeklyReviewCard } from "@/components/dashboard/weekly-review-card";
import {
  FormPillar,
  LoadPillar,
  ReadinessPillar,
  VerdictBanner,
  WellnessTile,
} from "@/components/dashboard/dashboard-cards";
import { DateSelector } from "@/components/dashboard/date-selector";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivities, useGoals, useHealthEntries } from "@/hooks/use-data";
import { usePhysicalNotes } from "@/hooks/use-physical";
import { useMounted } from "@/hooks/use-mounted";
import { categoryLabels, severityColor, sideLabels } from "@/lib/physical";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ClientActivity } from "@/lib/client/types";
import { dayActivities, dayHealth } from "@/lib/day";
import {
  activityTypeColors,
  activityTypeLabels,
  formatDistance,
  formatDuration,
} from "@/lib/format";
import { computeTrend, formatSleep, type HealthEntry } from "@/lib/health";
import {
  buildFormView,
  buildReadinessView,
  bodyBatteryTone,
  stressTone,
  type ReadinessFactor,
} from "@/lib/recovery";
import { ReadinessFactorList } from "@/components/recovery/recovery-panels";
import { acwrZone, buildTrainingVerdict, trendInfo } from "@/lib/dashboard";
import { computeAlerts } from "@/lib/alerts";
import { computePmcSeries } from "@/lib/analytics";
import { computeTrainingLoad } from "@/lib/training-load";
import {
  differenceInCalendarDays,
  format,
  isSameDay,
  isToday,
} from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";

export function DashboardView() {
  // `mounted` reste false côté serveur et à l'hydratation : on évite ainsi tout
  // décalage d'hydratation lié à l'heure locale (la date n'est rendue qu'ensuite).
  const mounted = useMounted();
  const [date, setDate] = useState<Date>(() => new Date());

  const activitiesQuery = useActivities();
  const healthQuery = useHealthEntries();
  const goalsQuery = useGoals();
  const physicalQuery = usePhysicalNotes();

  // Calculs lourds mémoïsés (déclarés avant tout early-return pour respecter les
  // règles des hooks). Ils ne se recalculent que si leurs données changent.
  const pmc = useMemo(
    () => computePmcSeries(activitiesQuery.data ?? []),
    [activitiesQuery.data],
  );
  const load = useMemo(
    () => computeTrainingLoad(activitiesQuery.data ?? [], date),
    [activitiesQuery.data, date],
  );
  const alerts = useMemo(
    () =>
      computeAlerts({
        activities: activitiesQuery.data ?? [],
        health: (healthQuery.data ?? []) as unknown as Parameters<
          typeof computeAlerts
        >[0]["health"],
        physicalNotes: (physicalQuery.data ?? []).map((n) => ({
          title: n.title,
          severity: n.severity,
          status: n.status,
        })),
        refDate: date,
      }),
    [activitiesQuery.data, healthQuery.data, physicalQuery.data, date],
  );

  const header = (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          SharpIt
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Ton readiness, ta forme et ta charge en un coup d&apos;œil
        </p>
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

  const activities = activitiesQuery.data ?? [];
  const todayActivities = dayActivities(activities, date);
  const health = dayHealth(healthQuery.data, date);
  const zone = acwrZone(load.acwr);

  // Forme (PMC) telle qu'elle était le jour sélectionné.
  const dateStr = format(date, "yyyy-MM-dd");
  const pmcUpTo = pmc.filter((p) => p.date <= dateStr);
  const form = buildFormView(pmcUpTo);
  const pmcPoint = pmcUpTo[pmcUpTo.length - 1];

  const readiness = buildReadinessView(
    health?.recoveryScore ?? null,
    health?.readinessLevel ?? null,
  );
  const readinessFactors = (health?.readinessFactors ??
    []) as unknown as ReadinessFactor[];

  const verdict = buildTrainingVerdict({
    readinessScore: readiness.score,
    readinessTone: readiness.tone,
    tsb: form.tsb,
    acwr: load.acwr,
  });

  // Tendances bien-être : moyenne 7j vs 7j précédents, à la date sélectionnée.
  const history = (healthQuery.data ?? []).filter(
    (h) => new Date(h.date) <= date,
  ) as unknown as HealthEntry[];
  const hrvTrend = trendInfo(computeTrend(history, "hrv").delta, true, " ms");
  const rhrTrend = trendInfo(
    computeTrend(history, "restingHr").delta,
    false,
    " bpm",
  );
  const sleepTrend = trendInfo(
    computeTrend(history, "sleepMinutes").delta,
    true,
    " min",
  );

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

  // Le poids n'est mesuré que certains jours. À défaut de pesée le jour
  // sélectionné, on affiche la dernière pesée connue jusqu'à cette date.
  const lastWeight = (() => {
    if (health?.weightKg != null) return { kg: health.weightKg, date };
    const entry = (healthQuery.data ?? [])
      .filter((h) => h.weightKg != null && new Date(h.date) <= date)
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )[0];
    return entry
      ? { kg: entry.weightKg as number, date: new Date(entry.date) }
      : null;
  })();
  const isCurrentDay = isToday(date);

  const activeNotes = (physicalQuery.data ?? []).filter(
    (n) => n.status !== "RESOLVED",
  );

  return (
    <div className="space-y-8">
      {header}

      <BriefingCard date={date} />

      <VerdictBanner verdict={verdict} />

      <AlertsBanner alerts={alerts} />

      <section className="grid gap-4 lg:grid-cols-3">
        <ReadinessPillar
          score={readiness.score}
          levelLabel={readiness.levelLabel}
          recommendation={
            readiness.score != null
              ? readiness.recommendation
              : "Pas de score de récupération pour ce jour."
          }
          accent={readiness.accent}
        />
        <FormPillar
          tsb={form.tsb}
          label={form.label}
          tone={form.tone}
          description={
            form.description || "Pas assez d'historique pour estimer la forme."
          }
          ctl={pmcPoint?.ctl ?? 0}
          atl={pmcPoint?.atl ?? 0}
        />
        <LoadPillar weeklyLoad={load.weeklyLoad} acwr={load.acwr} zone={zone} />
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Bien-être du jour
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <WellnessTile
            label="Sommeil"
            value={formatSleep(health?.sleepMinutes)}
            trend={health?.sleepMinutes != null ? sleepTrend : undefined}
          />
          <WellnessTile
            label="HRV"
            value={health?.hrv != null ? `${health.hrv} ms` : "—"}
            trend={health?.hrv != null ? hrvTrend : undefined}
            sublabel={
              health?.hrvBaselineLow != null && health?.hrvBaselineHigh != null
                ? `base ${health.hrvBaselineLow}–${health.hrvBaselineHigh}`
                : undefined
            }
          />
          <WellnessTile
            label="FC repos"
            value={health?.restingHr != null ? `${health.restingHr} bpm` : "—"}
            trend={health?.restingHr != null ? rhrTrend : undefined}
          />
          <WellnessTile
            label="Body Battery"
            value={
              health?.bodyBattery != null ? String(health.bodyBattery) : "—"
            }
            tone={bodyBatteryTone(health?.bodyBattery ?? null)}
          />
          <WellnessTile
            label="Stress"
            value={health?.stress != null ? String(health.stress) : "—"}
            tone={stressTone(health?.stress ?? null)}
          />
          <WellnessTile
            label="Poids"
            value={lastWeight ? `${lastWeight.kg} kg` : "—"}
            sublabel={
              lastWeight && !isSameDay(lastWeight.date, date)
                ? `le ${format(lastWeight.date, "d MMM", { locale: fr })}`
                : undefined
            }
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="min-h-44 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base font-medium text-muted-foreground">
              <span>Séance(s) du jour</span>
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
            <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
              <CalendarDays className="size-4 text-primary" />
              Prochaine échéance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextRace ? (
              <Link href="/goals" className="group block space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-4xl font-semibold tabular-nums text-primary">
                    J-{daysToRace}
                  </span>
                </div>
                <p className="font-medium group-hover:underline">
                  {nextRace.title}
                </p>
                {upcomingRaces[0] && (
                  <p className="text-xs text-muted-foreground">
                    {format(upcomingRaces[0].target, "EEEE d MMMM yyyy", {
                      locale: fr,
                    })}
                  </p>
                )}
              </Link>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Aucune course planifiée.
                </p>
                <LinkButton href="/goals" variant="outline" size="sm">
                  Définir un objectif
                </LinkButton>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <WeeklyReviewCard date={date} />

      {readinessFactors.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Facteurs de readiness
          </h2>
          <Card>
            <CardContent className="py-5">
              <p className="mb-3 text-xs text-muted-foreground">
                Score Garmin combinant ces facteurs (pas seulement la nuit
                dernière) :
              </p>
              <ReadinessFactorList factors={readinessFactors} />
            </CardContent>
          </Card>
        </section>
      )}

      {activeNotes.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Condition physique
            </h2>
            <Link
              href="/body"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Voir le suivi →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeNotes.slice(0, 6).map((note) => (
              <Link
                key={note.id}
                href="/body"
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{note.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {categoryLabels[note.category]}
                    {note.bodyPart
                      ? ` · ${note.bodyPart}${note.side !== "NA" ? ` (${sideLabels[note.side]})` : ""}`
                      : ""}
                  </p>
                </div>
                {note.severity != null && (
                  <span
                    className={cn(
                      "shrink-0 font-mono text-lg font-semibold",
                      severityColor(note.severity),
                    )}
                  >
                    {note.severity}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
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
          <span className="font-mono text-primary">
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
      <Skeleton className="h-28 rounded-xl" />
      <section className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </section>
      <section>
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-44 rounded-xl lg:col-span-2" />
        <Skeleton className="h-44 rounded-xl" />
      </section>
    </div>
  );
}
