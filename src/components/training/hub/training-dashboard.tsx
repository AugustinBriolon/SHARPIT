'use client';

import { differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { type ReactNode } from 'react';
import Link from 'next/link';
import { PlanningRow } from '@/components/today/dashboard/planning-row';
import { ActivityConsistencyPanel } from '@/components/today/dashboard/activity-consistency-panel';
import { ActivityList } from '@/components/training/activity/list/activity-list';
import {
  TrainingDashboardShell,
  TrainingSectionLink,
} from '@/components/training/hub/training-dashboard-shell';
import { TrainingTripsSection } from '@/components/training/hub/training-trips-section';
import { TrainingWeekStrip } from '@/components/training/hub/training-week-strip';
import { OfflineSnapshotSummary } from '@/components/pwa/offline-snapshot-summary';
import { Badge } from '@/components/ui/badge';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { useActivities, useGoals, usePlannedSessions } from '@/hooks/use-data';
import { useOfflineSnapshot } from '@/hooks/use-offline-snapshot';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { isAnyInitialQueryLoad } from '@/hooks/use-query-status';
import { useIsMobile } from '@/hooks/use-viewport';
import { selectUpcomingPlannedPreview } from '@/lib/planned-session/planned-session-dates';
import { resolvePlannedSessionDisplay } from '@/lib/planned-session/display/planned-session-display';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { cn } from '@/lib/utils';
import { GoalKind } from '@prisma/client';
import { CalendarClock } from 'lucide-react';

const PREVIEW_LIMIT_MOBILE = 2;
const PREVIEW_LIMIT_DESKTOP = 4;

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
    <section className={cn('surface-ink relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-surface-foreground/65 text-data inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
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
            <p className="text-ink-surface-foreground/80 mt-5 max-w-2xl text-sm leading-relaxed font-medium text-pretty">
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
            <span className="text-data text-xs tracking-wider opacity-70" aria-hidden>
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
  const online = useOnlineStatus();
  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();
  const valuesLoading = isAnyInitialQueryLoad([activitiesQuery, plannedQuery, goalsQuery]);
  const hasNoLiveData =
    activitiesQuery.data == null && plannedQuery.data == null && goalsQuery.data == null;
  const { entry: offlineEntry } = useOfflineSnapshot(!online && hasNoLiveData);

  if (!online && hasNoLiveData && offlineEntry) {
    return <OfflineSnapshotSummary entry={offlineEntry} />;
  }

  if (valuesLoading) {
    return <TrainingDashboardShell />;
  }

  const activities = activitiesQuery.data ?? [];
  const plannedSessions = plannedQuery.data ?? [];
  const today = new Date();
  const nextRaceGoal =
    (goalsQuery.data ?? [])
      .filter((goal) => goal.kind === GoalKind.RACE && !goal.achieved && goal.targetDate)
      .sort((a, b) => new Date(a.targetDate!).getTime() - new Date(b.targetDate!).getTime())[0] ??
    null;
  const upcomingRoutineSessions = nextRaceGoal
    ? plannedSessions.filter((session) => !isHeroRaceSession(session, nextRaceGoal))
    : plannedSessions;
  const previewLimit = isMobile ? PREVIEW_LIMIT_MOBILE : PREVIEW_LIMIT_DESKTOP;
  const nextSession = selectUpcomingPlannedPreview(upcomingRoutineSessions, today, 1)[0] ?? null;
  const latestActivities = activities.slice(0, previewLimit);
  const upcomingPreview = selectUpcomingPlannedPreview(
    upcomingRoutineSessions,
    today,
    previewLimit,
  );

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
    <div className="space-y-6 lg:space-y-8">
      <TrainingInstrumentPlate
        countdownLabel={countdownLabel}
        eventDateLabel={eventDateLabel}
        nextRaceGoal={nextRaceGoal}
        nextSession={nextSession}
      />

      <TrainingWeekStrip
        activities={activities}
        loading={false}
        plannedSessions={plannedSessions}
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
        <section className="min-w-0">
          <TrainingSectionLink cta="Planning" href="/training/planning" title="Séances à venir" />
          <PlanningRow
            className="sm:grid-cols-1"
            limit={previewLimit}
            sessions={upcomingRoutineSessions}
          />
          {upcomingPreview.length === 0 && (
            <InkEmptyState
              className="mt-1"
              description="Ouvre le planning pour programmer la suite."
              icon={CalendarClock}
              title="Aucune séance à venir"
              compact
            />
          )}
        </section>

        <section className="min-w-0">
          <TrainingSectionLink
            cta="Historique"
            href="/training/history"
            title="Activités récentes"
          />
          <ActivityList
            activities={latestActivities}
            emptyLabel="Aucune activité récente."
            variant="chip"
          />
        </section>
      </div>

      <TrainingTripsSection
        renderHeader={(props) => (
          <TrainingSectionLink cta={props.cta} href={props.href} title={props.title} />
        )}
      />

      <section>
        <TrainingSectionLink
          cta="Progression"
          href="/training/progression"
          title="Dynamique récente"
        />
        <ActivityConsistencyPanel activities={activities} loading={false} />
      </section>
    </div>
  );
}
