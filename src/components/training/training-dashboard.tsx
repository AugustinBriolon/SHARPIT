'use client';

import { differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo } from 'react';
import Link from 'next/link';
import { PlanningRow } from '@/components/today/dashboard/planning-row';
import { ActivityConsistencyPanel } from '@/components/today/dashboard/activity-consistency-panel';
import { ActivityList } from '@/components/training/activity-list';
import { TrainingWeekCalendarPreview } from '@/components/training/training-week-calendar-preview';
import { Badge } from '@/components/ui/badge';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivities, useGoals, usePlannedSessions } from '@/hooks/use-data';
import { isAnyInitialQueryLoad } from '@/hooks/use-query-status';
import { useIsMobile } from '@/hooks/use-viewport';
import { selectUpcomingPlannedPreview } from '@/lib/planned-session-dates';
import { resolvePlannedSessionDisplay } from '@/lib/planned-session-display';
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

function TrainingDashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="analysis-panel rounded-analysis-lg bg-primary/8 relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-label inline-flex items-center gap-2">
            <span className="bg-primary/50 h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden />
            Entraînement
          </p>
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="mt-6 h-9 w-[min(100%,22rem)] max-w-3xl rounded-lg sm:h-10" />
        <Skeleton className="mt-5 h-4 w-[min(100%,16rem)] rounded-full" />
        <Skeleton className="mt-8 h-3 w-36 rounded-full" />
      </section>

      <div className="space-y-2">
        <Skeleton className="h-3 w-28 rounded-full" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="border-analysis-border/80 bg-background/50 rounded-lg border px-3 py-2.5"
            >
              <Skeleton className="h-4 w-full max-w-[200px] rounded-full" />
              <Skeleton className="mt-2 h-3 w-28 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3 w-32 rounded-full" />
        {[0, 1].map((i) => (
          <div
            key={i}
            className="border-analysis-border/80 bg-background/50 rounded-lg border px-3 py-2.5"
          >
            <Skeleton className="h-4 w-full max-w-[240px] rounded-full" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3 w-36 rounded-full" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Skeleton className="analysis-panel rounded-analysis-lg h-48 w-full" />
          <Skeleton className="analysis-panel rounded-analysis-lg h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

function TrainingInstrumentPlate({
  nextRaceGoal,
  countdownLabel,
  eventDateLabel,
  nextSession,
}: {
  nextRaceGoal: ClientGoal | null;
  countdownLabel: string | null;
  eventDateLabel: string | null;
  nextSession: ClientPlannedSession | null;
}) {
  const hasRace = Boolean(nextRaceGoal && countdownLabel);
  const nextDisplay = nextSession ? resolvePlannedSessionDisplay(nextSession, new Date()) : null;

  let headline: string;
  let actionLine: string | null;
  let contextLabel: string;

  if (hasRace && nextRaceGoal && countdownLabel) {
    contextLabel = 'Objectif';
    headline = `${countdownLabel} · ${nextRaceGoal.title}`;
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

  const isInkEmpty = !hasRace && !nextDisplay;

  return (
    <section
      className={cn(
        'relative overflow-hidden',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200',
        isInkEmpty
          ? 'page-bleed-ink py-8 sm:py-10'
          : cn(
              'analysis-panel rounded-analysis-lg px-5 py-8 sm:px-8 sm:py-10',
              hasRace && 'border-[var(--color-signal-tempo)]/30 bg-[var(--color-signal-tempo)]/12',
              nextDisplay && 'border-primary/20 bg-primary/10',
            ),
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className={cn(
            'text-label inline-flex items-center gap-2',
            isInkEmpty && 'text-ink-surface-foreground/70',
          )}
        >
          <span
            className={cn(
              'h-2.5 w-2.5 shrink-0 rounded-full',
              hasRace && 'bg-[var(--color-signal-tempo)]',
              !hasRace && nextDisplay && 'bg-primary',
              isInkEmpty && 'bg-highlight',
            )}
            aria-hidden
          />
          {contextLabel}
        </p>
        {hasRace ? (
          <Badge
            className="border-analysis-border bg-background/70 rounded-full text-xs font-normal"
            variant="outline"
          >
            Course cible
          </Badge>
        ) : null}
      </div>

      <h1
        className={cn(
          'text-verdict mt-6 max-w-3xl text-[1.75rem] leading-[1.15] sm:text-[2.125rem]',
          hasRace && 'text-[var(--color-signal-tempo)]',
          !hasRace && nextDisplay && 'text-foreground',
          isInkEmpty && 'text-ink-surface-foreground',
        )}
      >
        {headline}
      </h1>

      {actionLine ? (
        <p
          className={cn(
            'mt-5 max-w-2xl text-sm leading-relaxed font-medium',
            isInkEmpty ? 'text-ink-surface-foreground/85' : 'text-foreground',
          )}
        >
          {actionLine}
        </p>
      ) : null}

      {hasRace && eventDateLabel ? (
        <p className="text-data text-muted-foreground mt-8 text-xs tracking-wide">
          {eventDateLabel}
        </p>
      ) : (
        <Link
          href="/training/planning"
          className={cn(
            'text-data mt-8 inline-flex items-center gap-1.5 text-xs tracking-wide transition-colors',
            isInkEmpty
              ? 'text-ink-surface-foreground/70 hover:text-ink-surface-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Ouvrir le planning
          <span className="text-[10px] tracking-wider opacity-70" aria-hidden>
            →
          </span>
        </Link>
      )}
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
    <div className="space-y-4 sm:space-y-5">
      <TrainingInstrumentPlate
        countdownLabel={countdownLabel}
        eventDateLabel={eventDateLabel}
        nextRaceGoal={nextRaceGoal}
        nextSession={nextSession}
      />

      <section>
        <SectionLink cta="Planning" href="/training/planning" title="Prochaines séances" />
        <PlanningRow limit={previewLimit} sessions={upcomingRoutineSessions} />
        {selectUpcomingPlannedPreview(upcomingRoutineSessions, today, previewLimit).length === 0 ? (
          <InkEmptyState
            className="mt-1"
            description="Ouvre le planning pour programmer la suite."
            icon={CalendarClock}
            title="Aucune séance à venir"
            compact
          />
        ) : null}
      </section>

      <section>
        <SectionLink cta="Historique" href="/training/history" title="Dernières activités" />
        <ActivityList
          activities={latestActivities}
          emptyLabel="Aucune activité récente."
          variant="chip"
        />
      </section>

      <section>
        <SectionLink cta="Progression" href="/training/progression" title="Dynamique récente" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <ActivityConsistencyPanel activities={activities} />
          <TrainingWeekCalendarPreview activities={activities} plannedSessions={plannedSessions} />
        </div>
      </section>
    </div>
  );
}
