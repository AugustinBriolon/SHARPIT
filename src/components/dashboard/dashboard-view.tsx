'use client';

import { DateSelector } from '@/components/dashboard/date-selector';
import { TodayCoachMessage } from '@/components/today/today-coach-message';
import { TodayDoneActivities } from '@/components/today/today-done';
import { TodayNextSession } from '@/components/today/today-next-session';
import { TodayPlannedSessions } from '@/components/today/today-planned';
import { TodayTodoSection } from '@/components/today/today-todo';
import { TodayVerdict } from '@/components/today/today-verdict';
import { WeeklyReviewCard } from '@/components/dashboard/weekly-review-card';
import { StickyHeader } from '@/components/layout/sticky-header';
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
import { dayActivities } from '@/lib/day';
import { activityTypeLabels } from '@/lib/format';
import { buildFormView, buildReadinessView } from '@/lib/recovery';
import { buildTrainingVerdict } from '@/lib/dashboard';
import { dayPageHeader } from '@/lib/day-page-title';
import { computeAlerts } from '@/lib/alerts';
import { computeProactiveActions } from '@/lib/proactive-coach';
import { computePmcSeries } from '@/lib/analytics';
import { computeTrainingLoad } from '@/lib/training-load';
import { differenceInCalendarDays, format, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export function DashboardView() {
  const mounted = useMounted();
  const [date, setDate] = useState<Date>(() => new Date());

  const activitiesQuery = useActivities();
  const healthQuery = useHealthEntries();
  const goalsQuery = useGoals();
  const physicalQuery = usePhysicalNotes();
  const plannedQuery = usePlannedSessions();
  const planQuery = useTrainingPlan();

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
        {mounted ? (
          (() => {
            const { title } = dayPageHeader(date);
            return (
              <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight capitalize">
                {title}
              </h1>
            );
          })()
        ) : (
          <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight">Ma journée</h1>
        )}
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
  const dayActs = dayActivities(activities, date);
  const healthToday = (healthQuery.data ?? []).find((h) => isSameDay(new Date(h.date), date));
  const dayPlanned = (plannedQuery.data ?? []).filter((s) => isSameDay(new Date(s.date), date));
  const plannedRemaining = dayPlanned.filter((s) => !s.completed && !s.activityId).length;
  const showPlanned = dayActs.length === 0 && dayPlanned.length > 0;
  const showDone = dayActs.length > 0;

  const dateStr = format(date, 'yyyy-MM-dd');
  const pmcUpTo = pmc.filter((p) => p.date <= dateStr);
  const form = buildFormView(pmcUpTo);
  const pmcPoint = pmcUpTo[pmcUpTo.length - 1];

  const readiness = buildReadinessView(
    healthToday?.recoveryScore ?? null,
    healthToday?.readinessLevel ?? null,
  );

  const isCurrentDay = isToday(date);

  const verdict = buildTrainingVerdict({
    readinessScore: readiness.score,
    readinessTone: readiness.tone,
    tsb: form.tsb,
    acwr: load.acwr,
    dayContext: {
      isViewingToday: isCurrentDay,
      hour: new Date().getHours(),
      activitiesToday: {
        count: dayActs.length,
        totalLoad: dayActs.reduce((sum, a) => sum + (a.load ?? 0), 0),
        sportLabels: [...new Set(dayActs.map((a) => activityTypeLabels[a.type]))],
      },
      plannedRemaining,
    },
  });

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

  return (
    <div className="mx-auto space-y-6">
      {header}

      <TodayVerdict
        verdict={verdict}
        metrics={{
          readinessScore: readiness.score,
          readinessLabel: readiness.levelLabel,
          tsb: form.tsb,
          ctl: pmcPoint?.ctl ?? 0,
          atl: pmcPoint?.atl ?? 0,
          acwr: load.acwr,
        }}
      />

      <TodayPlannedSessions date={date} hidden={!showPlanned} sessions={plannedQuery.data ?? []} />

      {showDone && <TodayDoneActivities activities={dayActs} date={date} />}

      <TodayTodoSection actions={proactiveActions} alerts={alerts} />

      <TodayCoachMessage date={date} />

      <TodayNextSession date={date} sessions={plannedQuery.data ?? []} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
            <CalendarDays className="text-primary size-4" />
            Prochain événement
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextRace ? (
            <Link className="group block space-y-1" href="/goals">
              <span className="text-primary font-mono text-4xl font-semibold tabular-nums">
                J-{daysToRace}
              </span>
              <p className="font-medium group-hover:underline">{nextRace.title}</p>
              {nextRace.priority && (
                <p className="text-muted-foreground text-xs">Objectif {nextRace.priority}</p>
              )}
              {upcomingRaces[0] && (
                <p className="text-muted-foreground text-xs">
                  {format(upcomingRaces[0].target, 'EEEE d MMMM yyyy', { locale: fr })}
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

      <WeeklyReviewCard date={date} />

      <p className="text-muted-foreground text-center text-xs">
        Tendances santé et statistiques détaillées dans{' '}
        <Link className="text-primary hover:underline" href="/corps">
          Mon corps
        </Link>
        .
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto space-y-6">
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  );
}
