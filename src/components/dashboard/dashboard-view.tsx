'use client';

import { StickyHeader } from '@/components/layout/sticky-header';
import { AlertsBanner } from '@/components/dashboard/alerts-banner';
import { ProactiveActionsCard } from '@/components/dashboard/proactive-actions-card';
import { BriefingCard } from '@/components/dashboard/briefing-card';
import { WeeklyReviewCard } from '@/components/dashboard/weekly-review-card';
import {
  FormPillar,
  LoadPillar,
  ReadinessPillar,
  VerdictBanner,
  WellnessTile,
} from '@/components/dashboard/dashboard-cards';
import { DateSelector } from '@/components/dashboard/date-selector';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useActivities,
  useGoals,
  useHealthEntries,
  usePlannedSessions,
  useTrainingPlan,
} from '@/hooks/use-data';
import { usePhysicalNotes } from '@/hooks/use-physical';
import { useMounted } from '@/hooks/use-mounted';
import { categoryLabels, severityColor, sideLabels } from '@/lib/physical';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { ClientActivity } from '@/lib/client/types';
import { dayActivities, dayHealth } from '@/lib/day';
import {
  activityTypeColors,
  activityTypeLabels,
  formatDistance,
  formatDuration,
} from '@/lib/format';
import { computeTrend, formatSleep, type HealthEntry } from '@/lib/health';
import {
  buildFormView,
  buildReadinessView,
  bodyBatteryTone,
  stressTone,
  type ReadinessFactor,
} from '@/lib/recovery';
import { ReadinessFactorList } from '@/components/recovery/recovery-panels';
import { acwrZone, buildTrainingVerdict, trendInfo } from '@/lib/dashboard';
import { computeAlerts } from '@/lib/alerts';
import { computeProactiveActions } from '@/lib/proactive-coach';
import { computePmcSeries } from '@/lib/analytics';
import { computeTrainingLoad } from '@/lib/training-load';
import { differenceInCalendarDays, format, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { useMemo, useState } from 'react';

export function DashboardView() {
  // `mounted` reste false côté serveur et à l'hydratation : on évite ainsi tout
  // décalage d'hydratation lié à l'heure locale (la date n'est rendue qu'ensuite).
  const mounted = useMounted();
  const [date, setDate] = useState<Date>(() => new Date());

  const activitiesQuery = useActivities();
  const healthQuery = useHealthEntries();
  const goalsQuery = useGoals();
  const physicalQuery = usePhysicalNotes();
  const plannedQuery = usePlannedSessions();
  const planQuery = useTrainingPlan();

  // Calculs lourds mémoïsés (déclarés avant tout early-return pour respecter les
  // règles des hooks). Ils ne se recalculent que si leurs données changent.
  const pmc = useMemo(() => computePmcSeries(activitiesQuery.data ?? []), [activitiesQuery.data]);
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
        >[0]['health'],
        physicalNotes: (physicalQuery.data ?? []).map((n) => ({
          title: n.title,
          severity: n.severity,
          status: n.status,
          category: n.category,
        })),
        refDate: date,
      }),
    [activitiesQuery.data, healthQuery.data, physicalQuery.data, date],
  );

  const proactiveActions = useMemo(() => {
    const pmcUpTo = pmc.filter((p) => p.date <= format(date, 'yyyy-MM-dd'));
    const pmcPoint = pmcUpTo[pmcUpTo.length - 1];
    const healthToday = (healthQuery.data ?? []).find((h) => isSameDay(new Date(h.date), date));
    return computeProactiveActions({
      refDate: date,
      activities: activitiesQuery.data ?? [],
      health: (healthQuery.data ?? []).map((h) => ({
        date: new Date(h.date),
        recoveryScore: h.recoveryScore,
        sleepMinutes: h.sleepMinutes,
        hrv: h.hrv,
      })),
      physicalNotes: physicalQuery.data ?? [],
      plannedSessions: plannedQuery.data ?? [],
      trainingPlan: planQuery.data ?? null,
      alerts,
      acwr: load.acwr,
      readinessScore: healthToday?.recoveryScore ?? null,
      tsb: pmcPoint?.tsb ?? null,
    });
  }, [
    pmc,
    activitiesQuery.data,
    healthQuery.data,
    physicalQuery.data,
    plannedQuery.data,
    planQuery.data,
    alerts,
    load.acwr,
    date,
  ]);

  const header = (
    <StickyHeader className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-primary text-xs font-medium tracking-[0.2em] uppercase">SharpIt</p>
        <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Ton readiness, ta forme et ta charge en un coup d&apos;œil
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {mounted && <DateSelector date={date} onChange={setDate} />}
        <LinkButton href="/training/new">Nouvelle séance</LinkButton>
      </div>
    </StickyHeader>
  );

  if (
    !mounted ||
    activitiesQuery.isLoading ||
    healthQuery.isLoading ||
    goalsQuery.isLoading ||
    plannedQuery.isLoading
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
  const dateStr = format(date, 'yyyy-MM-dd');
  const pmcUpTo = pmc.filter((p) => p.date <= dateStr);
  const form = buildFormView(pmcUpTo);
  const pmcPoint = pmcUpTo[pmcUpTo.length - 1];

  const readiness = buildReadinessView(
    health?.recoveryScore ?? null,
    health?.readinessLevel ?? null,
  );
  const readinessFactors = (health?.readinessFactors ?? []) as unknown as ReadinessFactor[];

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
  const hrvTrend = trendInfo(computeTrend(history, 'hrv').delta, true, ' ms');
  const rhrTrend = trendInfo(computeTrend(history, 'restingHr').delta, false, ' bpm');
  const sleepTrend = trendInfo(computeTrend(history, 'sleepMinutes').delta, true, ' min');

  const upcomingRaces = (goalsQuery.data ?? [])
    .flatMap((g) =>
      g.kind === 'RACE' && !g.achieved && g.targetDate != null
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
    const [entry] = (healthQuery.data ?? [])
      .filter((h) => h.weightKg != null && new Date(h.date) <= date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return entry ? { kg: entry.weightKg as number, date: new Date(entry.date) } : null;
  })();
  const isCurrentDay = isToday(date);

  const activeNotes = (physicalQuery.data ?? []).filter((n) => n.status !== 'RESOLVED');

  return (
    <div className="space-y-8">
      {header}

      <BriefingCard date={date} />

      <VerdictBanner verdict={verdict} />

      <ProactiveActionsCard actions={proactiveActions} />

      <AlertsBanner alerts={alerts} />

      <section className="grid gap-4 lg:grid-cols-3">
        <ReadinessPillar
          accent={readiness.accent}
          levelLabel={readiness.levelLabel}
          score={readiness.score}
          recommendation={
            readiness.score != null
              ? readiness.recommendation
              : 'Pas de score de récupération pour ce jour.'
          }
        />
        <FormPillar
          atl={pmcPoint?.atl ?? 0}
          ctl={pmcPoint?.ctl ?? 0}
          description={form.description || "Pas assez d'historique pour estimer la forme."}
          label={form.label}
          tone={form.tone}
          tsb={form.tsb}
        />
        <LoadPillar acwr={load.acwr} weeklyLoad={load.weeklyLoad} zone={zone} />
      </section>

      <section>
        <h2 className="text-muted-foreground mb-4 text-sm font-medium tracking-wider uppercase">
          Bien-être du jour
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <WellnessTile
            label="Sommeil"
            trend={health?.sleepMinutes != null ? sleepTrend : undefined}
            value={formatSleep(health?.sleepMinutes)}
          />
          <WellnessTile
            label="HRV"
            trend={health?.hrv != null ? hrvTrend : undefined}
            value={health?.hrv != null ? `${health.hrv} ms` : '—'}
            sublabel={
              health?.hrvBaselineLow != null && health?.hrvBaselineHigh != null
                ? `base ${health.hrvBaselineLow}–${health.hrvBaselineHigh}`
                : undefined
            }
          />
          <WellnessTile
            label="FC repos"
            trend={health?.restingHr != null ? rhrTrend : undefined}
            value={health?.restingHr != null ? `${health.restingHr} bpm` : '—'}
          />
          <WellnessTile
            label="Body Battery"
            tone={bodyBatteryTone(health?.bodyBattery ?? null)}
            value={health?.bodyBattery != null ? String(health.bodyBattery) : '—'}
          />
          <WellnessTile
            label="Stress"
            tone={stressTone(health?.stress ?? null)}
            value={health?.stress != null ? String(health.stress) : '—'}
          />
          <WellnessTile
            label="Poids"
            value={lastWeight ? `${lastWeight.kg} kg` : '—'}
            sublabel={
              lastWeight && !isSameDay(lastWeight.date, date)
                ? `le ${format(lastWeight.date, 'd MMM', { locale: fr })}`
                : undefined
            }
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="min-h-44 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-muted-foreground flex items-center justify-between text-base font-medium">
              <span>Séance(s) du jour</span>
              {todayActivities.length > 1 && (
                <Badge variant="outline">{todayActivities.length} séances</Badge>
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
                    : 'Aucune séance ce jour-là.'}
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
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
              <CalendarDays className="text-primary size-4" />
              Prochaine échéance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextRace ? (
              <Link className="group block space-y-1" href="/goals">
                <div className="flex items-baseline gap-2">
                  <span className="text-primary font-mono text-4xl font-semibold tabular-nums">
                    J-{daysToRace}
                  </span>
                </div>
                <p className="font-medium group-hover:underline">{nextRace.title}</p>
                {upcomingRaces[0] && (
                  <p className="text-muted-foreground text-xs">
                    {format(upcomingRaces[0].target, 'EEEE d MMMM yyyy', {
                      locale: fr,
                    })}
                  </p>
                )}
              </Link>
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">Aucune course planifiée.</p>
                <LinkButton href="/goals" size="sm" variant="outline">
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
          <h2 className="text-muted-foreground mb-4 text-sm font-medium tracking-wider uppercase">
            Facteurs de readiness
          </h2>
          <Card>
            <CardContent className="py-5">
              <p className="text-muted-foreground mb-3 text-xs">
                Score Garmin combinant ces facteurs (pas seulement la nuit dernière) :
              </p>
              <ReadinessFactorList factors={readinessFactors} />
            </CardContent>
          </Card>
        </section>
      )}

      {activeNotes.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
              Condition physique
            </h2>
            <Link className="text-muted-foreground hover:text-foreground text-xs" href="/body">
              Voir le suivi →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeNotes.slice(0, 6).map((note) => (
              <Link
                key={note.id}
                className="border-border bg-card hover:border-primary/30 flex items-center justify-between gap-3 rounded-lg border p-3"
                href="/body"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{note.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {categoryLabels[note.category]}
                    {note.bodyPart
                      ? ` · ${note.bodyPart}${note.side !== 'NA' ? ` (${sideLabels[note.side]})` : ''}`
                      : ''}
                  </p>
                </div>
                {note.severity != null && (
                  <span
                    className={cn(
                      'shrink-0 font-mono text-lg font-semibold',
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
      className="flex h-auto w-full items-center justify-between px-4 py-3"
      href={`/training/${activity.id}`}
      variant="outline"
    >
      <span className="flex items-center gap-3">
        <Badge className={activityTypeColors[activity.type]} variant="outline">
          {activityTypeLabels[activity.type]}
        </Badge>
        <span className="font-medium">{activity.title ?? activityTypeLabels[activity.type]}</span>
      </span>
      <span className="text-muted-foreground flex items-center gap-3 text-sm">
        <span>{formatDuration(activity.duration)}</span>
        {summary && <span>· {summary}</span>}
        {activity.load != null && (
          <span className="text-primary font-mono">{Math.round(activity.load)} TSS</span>
        )}
      </span>
    </LinkButton>
  );
}

function activitySummary(activity: ClientActivity): string | undefined {
  switch (activity.type) {
    case 'RUN':
      return activity.runMetrics?.distanceM
        ? formatDistance(activity.runMetrics.distanceM)
        : undefined;
    case 'BIKE':
      return activity.bikeMetrics?.tss ? `${Math.round(activity.bikeMetrics.tss)} TSS` : undefined;
    case 'SWIM':
      return activity.swimMetrics?.distanceM
        ? formatDistance(activity.swimMetrics.distanceM)
        : undefined;
    case 'STRENGTH':
      return activity.strengthSets.length ? `${activity.strengthSets.length} exercices` : undefined;
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
