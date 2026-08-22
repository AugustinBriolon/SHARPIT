'use client';

import { differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PlanningRow } from '@/components/today/dashboard/planning-row';
import { ActivityList } from '@/components/training/activity/list/activity-list';
import {
  TrainingDashboardShell,
  TrainingSectionLink,
} from '@/components/training/hub/training-dashboard-shell';
import { ProgressionDoors } from '@/components/training/hub/progression-doors';
import { TrainingNextSession } from '@/components/training/hub/training-next-session';
import { TrainingTripsSection } from '@/components/training/hub/training-trips-section';
import { TrainingWeekStrip } from '@/components/training/hub/training-week-strip';
import { OfflineSnapshotSummary } from '@/components/pwa/offline-snapshot-summary';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { useActivities, useGoals, usePlannedSessions } from '@/hooks/use-data';
import { useOfflineSnapshot } from '@/hooks/use-offline-snapshot';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { isAnyInitialQueryLoad } from '@/hooks/use-query-status';
import { useIsMobile } from '@/hooks/use-viewport';
import { selectUpcomingPlannedPreview } from '@/lib/planned-session/planned-session-dates';
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
}: {
  nextRaceGoal: ClientGoal | null;
  countdownLabel: string | null;
  eventDateLabel: string | null;
}) {
  if (!nextRaceGoal || !countdownLabel) return null;

  const context = [nextRaceGoal.raceFormat, nextRaceGoal.location].filter(Boolean).join(' · ');

  return (
    <section
      className={cn(
        'surface-ink relative overflow-hidden',
        'flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-4 sm:px-8',
      )}
    >
      <p className="text-ink-surface-foreground min-w-0 text-base sm:text-lg">
        <span className="text-data text-highlight dark:text-ink-surface-foreground font-semibold">
          {countdownLabel}
        </span>
        <span className="text-ink-surface-foreground/50" aria-hidden>
          {' · '}
        </span>
        {nextRaceGoal.title}
      </p>

      {context ? <p className="text-ink-surface-foreground/60 text-xs">{context}</p> : null}

      {/* `ml-auto` only once the row actually fits on one line — on a narrow screen
          it stranded the date alone on a third line, flush right. */}
      {eventDateLabel ? (
        <p className="text-data text-ink-surface-foreground/60 text-xs tracking-wide sm:ml-auto">
          {eventDateLabel}
        </p>
      ) : null}
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
  const laterSessions = nextSession
    ? upcomingRoutineSessions.filter((session) => session.id !== nextSession.id)
    : upcomingRoutineSessions;
  const latestActivities = activities.slice(0, previewLimit);

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
      />

      <TrainingNextSession session={nextSession} />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
        <section className="min-w-0">
          <TrainingSectionLink cta="Planning" href="/training/planning" title="Ensuite" />
          {/* The next session has its own block above; repeating it as the first
              chip here was the duplication this page already had once. */}
          <PlanningRow className="sm:grid-cols-1" limit={previewLimit} sessions={laterSessions} />
          {laterSessions.length === 0 && (
            <InkEmptyState
              className="mt-1"
              description="Ouvre le planning pour programmer la suite."
              icon={CalendarClock}
              title="Rien d’autre de prévu"
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

      <TrainingWeekStrip
        activities={activities}
        loading={false}
        plannedSessions={plannedSessions}
      />

      <TrainingTripsSection
        renderHeader={(props) => (
          <TrainingSectionLink cta={props.cta} href={props.href} title={props.title} />
        )}
      />

      <ProgressionDoors />
    </div>
  );
}
