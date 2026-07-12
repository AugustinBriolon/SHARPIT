'use client';

import { differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SportDistributionChart } from '@/components/analytics/sport-distribution-chart';
import { PageHeader } from '@/components/layout/sticky-header';
import { PlanningRow } from '@/components/today/dashboard/planning-row';
import { ActivityConsistencyPanel } from '@/components/today/dashboard/activity-consistency-panel';
import { ActivityList } from '@/components/training/activity-list';
import { TrainingWeekCalendarPreview } from '@/components/training/training-week-calendar-preview';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SkeletonCard,
  SkeletonEyebrow,
  SkeletonHeroSplit,
  SkeletonPhysioRail,
  SkeletonText,
  SkeletonTitle,
} from '@/components/ui/skeleton-patterns';
import { useActivities, useGoals, usePlannedSessions } from '@/hooks/use-data';
import { isAnyInitialQueryLoad } from '@/hooks/use-query-status';
import { useIsMobile } from '@/hooks/use-viewport';
import { buildAnalyticsViewModel } from '@/lib/analytics';
import { filterUpcomingPlannedSessions } from '@/lib/planned-session-dates';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { GoalKind } from '@prisma/client';

function SectionHeader({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <p className="text-label">{title}</p>
        <p className="text-foreground mt-1 text-sm font-medium">{description}</p>
      </div>
      <Link
        className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
        href={href}
      >
        {cta}
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function TrainingDashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <SkeletonEyebrow className="w-24" />
        <SkeletonTitle className="h-8 w-72 max-w-full" size="md" />
        <SkeletonText widths={['100%', '94%', '72%']} />
      </div>

      <SkeletonHeroSplit />

      <SkeletonCard className="px-0 py-0">
        <div className="mb-3 flex items-end justify-between gap-3 px-4 pt-4 sm:px-5">
          <div className="space-y-2">
            <SkeletonEyebrow className="w-32" />
            <Skeleton className="h-4 w-56 max-w-full rounded-full border-0" />
          </div>
          <Skeleton className="h-3.5 w-28 rounded-full border-0" />
        </div>
        <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:px-5 md:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="analysis-panel rounded-analysis space-y-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-5 w-16 rounded-full border-0" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-4 w-40 max-w-full rounded-full border-0" />
              <SkeletonPhysioRail />
            </div>
          ))}
        </div>
      </SkeletonCard>

      <SkeletonCard className="px-0 py-0">
        <div className="mb-3 flex items-end justify-between gap-3 px-4 pt-4 sm:px-5">
          <div className="space-y-2">
            <SkeletonEyebrow className="w-28" />
            <Skeleton className="h-4 w-48 max-w-full rounded-full border-0" />
          </div>
          <Skeleton className="h-3.5 w-24 rounded-full border-0" />
        </div>
        <div className="space-y-2 px-4 pb-4 sm:px-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border-border/60 flex items-center gap-3 rounded-xl border px-3 py-3"
            >
              <Skeleton className="size-9 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40 max-w-full rounded-full border-0" />
                <Skeleton className="h-3 w-24 rounded-full border-0" />
              </div>
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </SkeletonCard>

      <div className="space-y-3">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="space-y-2">
            <SkeletonEyebrow className="w-32" />
            <Skeleton className="h-4 w-52 max-w-full rounded-full border-0" />
          </div>
          <Skeleton className="h-3.5 w-28 rounded-full border-0" />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SkeletonCard className="min-h-48">
            <SkeletonEyebrow className="w-24" />
            <Skeleton className="rounded-analysis mt-4 h-32 w-full border-0" />
          </SkeletonCard>
          <SkeletonCard className="min-h-48">
            <SkeletonEyebrow className="w-28" />
            <div className="mt-4 grid grid-cols-5 gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="rounded-analysis h-20 border-0" />
              ))}
            </div>
          </SkeletonCard>
          <SkeletonCard className="min-h-56 md:col-span-2">
            <SkeletonEyebrow className="w-32" />
            <Skeleton className="rounded-analysis mt-4 h-40 w-full border-0" />
          </SkeletonCard>
        </div>
      </div>
    </div>
  );
}

function TrainingGoalHero({
  title,
  raceFormat,
  location,
  countdownLabel,
  eventDateLabel,
}: {
  title: string;
  raceFormat: string | null;
  location: string | null;
  countdownLabel: string;
  eventDateLabel: string;
}) {
  const contextLine = [raceFormat, location].filter(Boolean).join(' · ');

  return (
    <section className="analysis-panel-alt rounded-analysis-lg px-5 py-5 sm:px-6 sm:py-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_18rem] xl:items-start">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-label">objectif prioritaire</p>
              <h2 className="font-heading text-xl leading-snug font-semibold tracking-tight sm:text-[1.55rem]">
                {title}
              </h2>
            </div>
            <Badge
              className="border-analysis-border bg-background/70 rounded-full text-xs font-normal"
              variant="outline"
            >
              Course cible
            </Badge>
          </div>
          {contextLine ? (
            <p className="text-foreground max-w-2xl text-sm leading-relaxed font-medium">
              {contextLine}
            </p>
          ) : null}
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            L&apos;échéance la plus proche mérite une lecture dédiée, séparée des séances de
            routine.
          </p>
        </div>

        <div className="analysis-panel rounded-analysis px-4 py-4">
          <p className="text-label">compte à rebours</p>
          <p className="text-data text-foreground mt-2 text-3xl font-semibold">{countdownLabel}</p>
          <p className="text-data text-muted-foreground mt-1 text-sm">{eventDateLabel}</p>
        </div>
      </div>
    </section>
  );
}

function isHeroRaceSession(session: ClientPlannedSession, goal: ClientGoal): boolean {
  if (!goal.targetDate) return false;
  const sameGoal = session.goalId === goal.id;
  const sameTitle = session.title?.trim().toLowerCase() === goal.title.trim().toLowerCase();
  const sameDay = differenceInCalendarDays(new Date(session.date), new Date(goal.targetDate)) === 0;
  return sameGoal || session.intensity === 'RACE' || (sameTitle && sameDay);
}

export function TrainingDashboard() {
  const isMobile = useIsMobile();
  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();
  const activities = activitiesQuery.data ?? [];
  const plannedSessions = plannedQuery.data ?? [];
  const analytics = useMemo(() => buildAnalyticsViewModel(activities), [activities]);
  const today = new Date();
  const nextRaceGoal = useMemo(() => {
    return (
      (goalsQuery.data ?? [])
        .filter((goal) => goal.kind === GoalKind.RACE && !goal.achieved && goal.targetDate)
        .sort((a, b) => new Date(a.targetDate!).getTime() - new Date(b.targetDate!).getTime())[0] ??
      null
    );
  }, [goalsQuery.data]);
  const upcomingRoutineSessions = useMemo(() => {
    if (!nextRaceGoal) return plannedSessions;
    return plannedSessions.filter((session) => !isHeroRaceSession(session, nextRaceGoal));
  }, [nextRaceGoal, plannedSessions]);
  const planningLimit = isMobile ? 2 : 4;
  const displayedUpcomingCount = useMemo(() => {
    return filterUpcomingPlannedSessions(upcomingRoutineSessions, today).slice(0, planningLimit)
      .length;
  }, [planningLimit, today, upcomingRoutineSessions]);
  let planningDescription = 'Les prochaines séances qui structurent la suite.';
  if (displayedUpcomingCount === 1) {
    planningDescription = 'La prochaine séance qui structure la suite.';
  } else if (displayedUpcomingCount > 1) {
    planningDescription = `Les ${displayedUpcomingCount} prochaines séances qui structurent la suite.`;
  }
  const latestActivities = activities.slice(0, isMobile ? 2 : 4);

  if (isAnyInitialQueryLoad([activitiesQuery, plannedQuery, goalsQuery])) {
    return <TrainingDashboardSkeleton />;
  }

  let countdownLabel: string | null = null;
  let eventDateLabel: string | null = null;
  if (nextRaceGoal?.targetDate) {
    const days = differenceInCalendarDays(new Date(nextRaceGoal.targetDate), today);
    if (days === 0) countdownLabel = 'Aujourd’hui';
    else if (days > 0) countdownLabel = `J-${days}`;
    else countdownLabel = `J+${Math.abs(days)}`;
    eventDateLabel = format(new Date(nextRaceGoal.targetDate), 'EEEE d MMMM yyyy', { locale: fr });
  }

  return (
    <div className="space-y-8">
      <PageHeader>
        <p className="text-label">Entraînement</p>
        <h1 className="font-heading mt-1 text-2xl font-semibold">Prévu, réalisé & progression</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Lis ce qui t’attend, ce que tu as déjà fait et comment ton entraînement se construit dans
          le temps.
        </p>
      </PageHeader>

      {nextRaceGoal && countdownLabel && eventDateLabel ? (
        <TrainingGoalHero
          countdownLabel={countdownLabel}
          eventDateLabel={eventDateLabel}
          location={nextRaceGoal.location}
          raceFormat={nextRaceGoal.raceFormat}
          title={nextRaceGoal.title}
        />
      ) : null}

      <SectionHeader
        cta="Ouvrir le planning"
        description={planningDescription}
        href="/training/planning"
        title="Prochaines séances"
      />
      <PlanningRow compact={isMobile} limit={planningLimit} sessions={upcomingRoutineSessions} />

      <SectionHeader
        cta="Voir l’historique"
        href="/training/history"
        title="Dernières activités"
        description={
          isMobile
            ? 'Les 2 dernières séances seulement.'
            : 'Les dernières séances pour lire la dynamique récente.'
        }
      />
      <ActivityList
        activities={latestActivities}
        compact={isMobile}
        emptyLabel="Aucune activité récente."
      />

      <section className="space-y-3">
        <SectionHeader
          cta="Voir la progression"
          description="Une lecture courte de la dynamique récente."
          href="/training/progression"
          title="Progression récente"
        />
        <div className="grdi-cols-1 grid gap-5 md:grid-cols-2">
          <ActivityConsistencyPanel activities={activities} />
          <TrainingWeekCalendarPreview activities={activities} plannedSessions={plannedSessions} />
          <SportDistributionChart className="col-span-2" data={analytics.distribution} />
        </div>
      </section>
    </div>
  );
}
