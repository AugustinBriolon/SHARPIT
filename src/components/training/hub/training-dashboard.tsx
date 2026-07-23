'use client';

import { differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { PlanningRow } from '@/components/today/dashboard/planning-row';
import { ActivityConsistencyPanel } from '@/components/today/dashboard/activity-consistency-panel';
import { ActivityList } from '@/components/training/activity/activity-list';
import { TrainingWeekStrip } from '@/components/training/hub/training-week-strip';
import { Badge } from '@/components/ui/badge';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { InstrumentListChipSkeleton } from '@/components/ui/instrument-list-chip';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { useActivities, useGoals, usePlannedSessions } from '@/hooks/use-data';
import { isAnyInitialQueryLoad } from '@/hooks/use-query-status';
import { useIsMobile } from '@/hooks/use-viewport';
import { selectUpcomingPlannedPreview } from '@/lib/planned-session/planned-session-dates';
import { resolvePlannedSessionDisplay } from '@/lib/planned-session/planned-session-display';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { cn } from '@/lib/utils';
import { GoalKind } from '@prisma/client';
import { CalendarClock } from 'lucide-react';

const PREVIEW_LIMIT_MOBILE = 2;
const PREVIEW_LIMIT_DESKTOP = 4;

function SectionLink({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3 px-0.5">
      <p className="text-label">{title}</p>
      <Link
        href={href}
        className={cn(
          'text-muted-foreground hover:text-primary inline-flex items-center gap-1',
          'text-data text-[11px] tracking-wide transition-colors',
          'focus-visible:ring-primary/35 rounded-sm focus-visible:ring-2 focus-visible:outline-hidden',
        )}
      >
        {cta}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

function PreviewChipSkeleton({ count }: { count: number }) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="min-w-0">
          <InstrumentListChipSkeleton titleWidth="w-[min(100%,12rem)]" />
        </li>
      ))}
    </ul>
  );
}

function ActivityChipSkeleton({ count }: { count: number }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="min-w-0">
          <InstrumentListChipSkeleton titleWidth="w-[min(100%,14rem)]" />
        </li>
      ))}
    </ul>
  );
}

function TrainingInstrumentPlate({
  nextRaceGoal,
  countdownLabel,
  eventDateLabel,
  nextSession,
  loading = false,
}: {
  nextRaceGoal: ClientGoal | null;
  countdownLabel: string | null;
  eventDateLabel: string | null;
  nextSession: ClientPlannedSession | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <section
        className={cn(
          'surface-ink relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10',
          'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-ink-surface-foreground/65 inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase">
            <span
              className="bg-highlight dark:bg-ink-surface-foreground h-2.5 w-2.5 shrink-0 rounded-full"
              aria-hidden
            />
            Entraînement
          </p>
        </div>
        <div className="mt-6">
          <SkeletonDataValue
            className="bg-ink-surface-foreground/20"
            heightClassName="h-9 sm:h-10"
            widthClassName="w-[min(100%,22rem)]"
          />
        </div>
        <div className="border-highlight dark:border-ink-surface-foreground/80 mt-5 border-l-2 pl-3">
          <SkeletonDataValue
            className="bg-ink-surface-foreground/20"
            heightClassName="h-4"
            widthClassName="w-[min(100%,16rem)]"
          />
        </div>
        <Link
          className="text-data text-ink-surface-foreground/70 hover:text-ink-surface-foreground mt-8 inline-flex items-center gap-1.5 text-xs tracking-wide transition-colors"
          href="/training/planning"
        >
          Ouvrir le planning
          <span className="text-[10px] tracking-wider opacity-70" aria-hidden>
            →
          </span>
        </Link>
      </section>
    );
  }

  const hasRace = Boolean(nextRaceGoal && countdownLabel);
  const nextDisplay = nextSession ? resolvePlannedSessionDisplay(nextSession, new Date()) : null;

  let headline: ReactNode;
  let actionLine: string | null;
  let contextLabel: string;

  if (hasRace && nextRaceGoal && countdownLabel) {
    contextLabel = 'Objectif';
    headline = (
      <>
        <span className="text-data text-highlight dark:text-ink-surface-foreground">
          {countdownLabel}
        </span>
        {` · ${nextRaceGoal.title}`}
      </>
    );
    const contextBits = [nextRaceGoal.raceFormat, nextRaceGoal.location].filter(Boolean);
    if (nextDisplay != null) {
      actionLine = `Prochaine séance · ${nextDisplay.title}`;
    } else if (contextBits.length > 0) {
      actionLine = contextBits.join(' · ');
    } else {
      actionLine = 'Ouvre le planning pour structurer la suite.';
    }
  } else if (nextDisplay) {
    contextLabel = 'Entraînement';
    headline = nextDisplay.title;
    actionLine = `${nextDisplay.dateStr}${nextDisplay.intensityLabel ? ` · ${nextDisplay.intensityLabel}` : ''}`;
  } else {
    contextLabel = 'Entraînement';
    headline = 'Rien de structurant à venir';
    actionLine = 'Planifie la prochaine séance qui compte.';
  }

  return (
    <section
      className={cn(
        'surface-ink relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-surface-foreground/65 inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase">
          <span
            className="bg-highlight dark:bg-ink-surface-foreground h-2.5 w-2.5 shrink-0 rounded-full"
            aria-hidden
          />
          {contextLabel}
        </p>
        {hasRace ? (
          <Badge
            className="border-ink-surface-foreground/25 text-ink-surface-foreground/80 rounded-full bg-transparent text-xs font-normal"
            variant="outline"
          >
            Course cible
          </Badge>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
        <div className="min-w-0">
          <h1 className="text-verdict text-ink-surface-foreground max-w-3xl text-[1.75rem] leading-[1.15] sm:text-[2.125rem]">
            {headline}
          </h1>

          {actionLine ? (
            <p className="border-highlight dark:border-ink-surface-foreground/80 text-ink-surface-foreground/80 mt-5 max-w-2xl border-l-2 pl-3 text-sm leading-relaxed font-medium">
              {actionLine}
            </p>
          ) : null}
        </div>

        {hasRace && eventDateLabel ? (
          <p className="text-data text-ink-surface-foreground/60 text-xs tracking-wide">
            {eventDateLabel}
          </p>
        ) : (
          <Link
            className="text-data text-ink-surface-foreground/70 hover:text-ink-surface-foreground inline-flex items-center gap-1.5 text-xs tracking-wide transition-colors"
            href="/training/planning"
          >
            Ouvrir le planning
            <span className="text-[10px] tracking-wider opacity-70" aria-hidden>
              →
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}

function isHeroRaceSession(session: ClientPlannedSession, goal: ClientGoal): boolean {
  if (!goal.targetDate) return false;
  const sameDay = differenceInCalendarDays(new Date(session.date), new Date(goal.targetDate)) === 0;
  if (!sameDay) return false;
  const sameGoal = session.goalId === goal.id;
  const sameTitle = session.title?.trim().toLowerCase() === goal.title.trim().toLowerCase();
  return sameGoal || session.intensity === 'RACE' || sameTitle;
}

export function TrainingDashboard() {
  const isMobile = useIsMobile();
  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();
  const valuesLoading = isAnyInitialQueryLoad([activitiesQuery, plannedQuery, goalsQuery]);
  const activities = activitiesQuery.data ?? [];
  const plannedSessions = plannedQuery.data ?? [];
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
  const previewLimit = isMobile ? PREVIEW_LIMIT_MOBILE : PREVIEW_LIMIT_DESKTOP;
  const nextSession = useMemo(() => {
    return selectUpcomingPlannedPreview(upcomingRoutineSessions, today, 1)[0] ?? null;
  }, [today, upcomingRoutineSessions]);
  const latestActivities = activities.slice(0, previewLimit);
  const upcomingPreview = selectUpcomingPlannedPreview(
    upcomingRoutineSessions,
    today,
    previewLimit,
  );

  let countdownLabel: string | null = null;
  let eventDateLabel: string | null = null;
  if (!valuesLoading && nextRaceGoal?.targetDate) {
    const days = differenceInCalendarDays(new Date(nextRaceGoal.targetDate), today);
    if (days === 0) countdownLabel = 'Aujourd’hui';
    else if (days > 0) countdownLabel = `J-${days}`;
    else countdownLabel = `J+${Math.abs(days)}`;
    eventDateLabel = format(new Date(nextRaceGoal.targetDate), 'EEEE d MMMM yyyy', { locale: fr });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <TrainingInstrumentPlate
        countdownLabel={countdownLabel}
        eventDateLabel={eventDateLabel}
        loading={valuesLoading}
        nextRaceGoal={valuesLoading ? null : nextRaceGoal}
        nextSession={valuesLoading ? null : nextSession}
      />

      <TrainingWeekStrip
        activities={activities}
        loading={valuesLoading}
        plannedSessions={plannedSessions}
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
        <section className="min-w-0">
          <SectionLink cta="Planning" href="/training/planning" title="Séances à venir" />
          {valuesLoading ? <PreviewChipSkeleton count={previewLimit} /> : null}
          {!valuesLoading ? (
            <PlanningRow
              className="sm:grid-cols-1"
              limit={previewLimit}
              sessions={upcomingRoutineSessions}
            />
          ) : null}
          {!valuesLoading && upcomingPreview.length === 0 ? (
            <InkEmptyState
              className="mt-1"
              description="Ouvre le planning pour programmer la suite."
              icon={CalendarClock}
              title="Aucune séance à venir"
              compact
            />
          ) : null}
        </section>

        <section className="min-w-0">
          <SectionLink cta="Historique" href="/training/history" title="Activités récentes" />
          {valuesLoading ? <ActivityChipSkeleton count={previewLimit} /> : null}
          {!valuesLoading ? (
            <ActivityList
              activities={latestActivities}
              emptyLabel="Aucune activité récente."
              variant="chip"
            />
          ) : null}
        </section>
      </div>

      <section>
        <SectionLink cta="Progression" href="/training/progression" title="Dynamique récente" />
        <ActivityConsistencyPanel activities={activities} loading={valuesLoading} />
      </section>
    </div>
  );
}
