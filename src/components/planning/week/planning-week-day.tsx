'use client';

import { format, isBefore, isToday, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { BrickOverviewCard } from '@/components/planning/brick/brick-overview-card';
import { firstOpenPlannedSessionId } from '@/components/planning/week/planning-day-row-helpers';
import { PlanningSettledRow } from '@/components/planning/week/planning-settled-row';
import { PlannedSessionPreview } from '@/components/today/rich/planned-session-preview';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  brickLegSummaries,
  groupPlannedSessions,
} from '@/lib/planned-session/brick/brick-sessions';
import { activityTypeLabels } from '@/lib/format';
import { planningDayKey } from '@/lib/plan/planning-day-selection';
import { planningSessionMode } from '@/lib/plan/planning-day-display';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { buildPlannedSessionPreview } from '@/lib/today/rich/planned-session-metrics';
import { TWIN_DRILL_DOWN } from '@/lib/today/navigation/today-twin-navigation';
import { cn } from '@/lib/utils';

function PlannedDayPreview({
  session,
  primary,
  onEdit,
  onPrefetch,
}: {
  session: ClientPlannedSession;
  primary: boolean;
  onEdit: (session: ClientPlannedSession) => void;
  onPrefetch: (session: ClientPlannedSession) => void;
}) {
  const preview = buildPlannedSessionPreview({
    type: session.type,
    durationMin: session.durationMin,
    intensity: session.intensity,
    load: session.load,
    title: session.title,
    description: session.description,
    accessories: session.accessories,
    strengthPrescription: session.strengthPrescription,
  });
  const title = session.title?.trim() || activityTypeLabels[session.type];

  return (
    <PlannedSessionPreview
      activityType={session.type}
      density="compact"
      equipment={preview.equipment}
      metrics={preview.metrics}
      primary={primary && !session.completed}
      secondary={session.description}
      title={title}
      onOpen={() => {
        onPrefetch(session);
        onEdit(session);
      }}
    />
  );
}

function DoneActivityPreview({ activity }: { activity: ClientActivity }) {
  const title = activity.title?.trim() || activityTypeLabels[activity.type];

  return (
    <PlanningSettledRow
      activityType={activity.type}
      durationSec={activity.duration}
      href={TWIN_DRILL_DOWN.activity(activity.id)}
      mode="done"
      title={title}
    />
  );
}

function LinkedDonePreview({
  session,
  activity,
}: {
  session: ClientPlannedSession;
  activity: ClientActivity;
}) {
  const title = session.title?.trim() || activity.title?.trim() || activityTypeLabels[session.type];

  return (
    <PlanningSettledRow
      activityType={activity.type}
      analysis={session.analysis}
      durationSec={activity.duration}
      href={TWIN_DRILL_DOWN.activity(activity.id)}
      mode="done"
      title={title}
    />
  );
}

function MissedSessionRow({ session }: { session: ClientPlannedSession }) {
  const title = session.title?.trim() || activityTypeLabels[session.type];

  return <PlanningSettledRow activityType={session.type} href={null} mode="missed" title={title} />;
}

function SessionItem({
  session,
  activityById,
  isPastDay,
  primary,
  onEdit,
  onPrefetch,
}: {
  session: ClientPlannedSession;
  activityById: ReadonlyMap<string, ClientActivity>;
  isPastDay: boolean;
  primary: boolean;
  onEdit: (session: ClientPlannedSession) => void;
  onPrefetch: (session: ClientPlannedSession) => void;
}) {
  const mode = planningSessionMode({
    completed: session.completed,
    activityId: session.activityId,
    isPastDay,
  });

  if (mode === 'done') {
    const linked = session.activityId ? activityById.get(session.activityId) : undefined;
    if (linked) {
      return <LinkedDonePreview activity={linked} session={session} />;
    }
  }

  if (mode === 'missed') {
    return <MissedSessionRow session={session} />;
  }

  return (
    <PlannedDayPreview
      primary={primary}
      session={session}
      onEdit={onEdit}
      onPrefetch={onPrefetch}
    />
  );
}

function PlannedGroups({
  planned,
  activityById,
  isPastDay,
  onEdit,
  onPrefetch,
}: {
  planned: ClientPlannedSession[];
  activityById: ReadonlyMap<string, ClientActivity>;
  isPastDay: boolean;
  onEdit: (session: ClientPlannedSession) => void;
  onPrefetch: (session: ClientPlannedSession) => void;
}) {
  const groups = groupPlannedSessions(planned);
  if (groups.length === 0) {
    return null;
  }
  const primarySessionId = firstOpenPlannedSessionId(groups);

  return (
    <ul className="space-y-2.5">
      {groups.map((item) => {
        if (item.kind === 'single') {
          return (
            <li key={item.session.id}>
              <SessionItem
                activityById={activityById}
                isPastDay={isPastDay}
                primary={item.session.id === primarySessionId}
                session={item.session}
                onEdit={onEdit}
                onPrefetch={onPrefetch}
              />
            </li>
          );
        }

        return (
          <li key={item.id}>
            <BrickOverviewCard
              legs={brickLegSummaries(item.sessions)}
              primary={item.sessions.some((session) => session.id === primarySessionId)}
              onOpenLeg={(legId) => {
                const session = item.sessions.find((candidate) => candidate.id === legId);
                if (!session) {
                  return;
                }
                onPrefetch(session);
                onEdit(session);
              }}
            />
          </li>
        );
      })}
    </ul>
  );
}

function UnlinkedDoneList({ activities }: { activities: ClientActivity[] }) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2.5">
      {activities.map((activity) => (
        <li key={activity.id}>
          <DoneActivityPreview activity={activity} />
        </li>
      ))}
    </ul>
  );
}

function QuietRest({ date, onAdd }: { date: Date; onAdd: () => void }) {
  const label = format(date, 'EEEE d MMMM', { locale: fr });

  return (
    <button
      aria-label={`Planifier une séance le ${label}`}
      className="text-muted-foreground hover:text-foreground pressable min-h-9 text-left text-sm"
      type="button"
      onClick={onAdd}
    >
      Repos
    </button>
  );
}

function planningWeekDaySectionClass(today: boolean, riskDay: boolean): string {
  return cn(
    'flex scroll-mt-24 gap-3 sm:gap-4',
    today && 'rounded-analysis bg-primary/4 -mx-2 px-2 py-2 sm:-mx-3 sm:px-3',
    riskDay && !today && 'rounded-analysis bg-signal-caution/6 -mx-2 px-2 py-2 sm:-mx-3 sm:px-3',
    riskDay && today && 'rounded-analysis bg-signal-caution/10 -mx-2 px-2 py-2 sm:-mx-3 sm:px-3',
  );
}

function planningWeekDayNumberClass(today: boolean, riskDay: boolean): string {
  return cn(
    'mt-0.5 font-mono text-lg font-semibold tabular-nums',
    today && 'text-primary',
    riskDay && !today && 'text-signal-caution',
  );
}

function PlanningWeekDayContent({
  activityById,
  activities,
  date,
  empty,
  isPastDay,
  loading,
  planned,
  onAdd,
  onEdit,
  onPrefetch,
}: {
  activityById: ReadonlyMap<string, ClientActivity>;
  activities: ClientActivity[];
  date: Date;
  empty: boolean;
  isPastDay: boolean;
  loading: boolean;
  planned: ClientPlannedSession[];
  onAdd: () => void;
  onEdit: (session: ClientPlannedSession) => void;
  onPrefetch: (session: ClientPlannedSession) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 py-0.5">
        <Skeleton className="rounded-analysis h-14 w-full border-0" />
        <Skeleton className="rounded-analysis h-14 w-4/5 border-0" />
      </div>
    );
  }

  if (empty) {
    return <QuietRest date={date} onAdd={onAdd} />;
  }

  return (
    <>
      <PlannedGroups
        activityById={activityById}
        isPastDay={isPastDay}
        planned={planned}
        onEdit={onEdit}
        onPrefetch={onPrefetch}
      />
      <UnlinkedDoneList activities={activities} />
    </>
  );
}

/**
 * One day in the week overview — date rail + sessions in the same scroll.
 * Empty days stay quiet so the week remains scannable.
 */
export function PlanningWeekDay({
  activityById,
  activities,
  date,
  loading,
  planned,
  riskDay,
  onAdd,
  onEdit,
  onPrefetch,
}: {
  activityById: ReadonlyMap<string, ClientActivity>;
  activities: ClientActivity[];
  date: Date;
  loading: boolean;
  planned: ClientPlannedSession[];
  riskDay: boolean;
  onAdd: () => void;
  onEdit: (session: ClientPlannedSession) => void;
  onPrefetch: (session: ClientPlannedSession) => void;
}) {
  const empty = !loading && planned.length === 0 && activities.length === 0;
  const today = isToday(date);
  // A settled day states its outcome quietly; the week keeps its weight on what is ahead.
  const isPastDay = isBefore(startOfDay(date), startOfDay(new Date()));
  const dayId = planningDayKey(date);
  const headingId = `planning-day-${dayId}`;
  const addLabel = format(date, 'EEEE d MMMM', { locale: fr });

  return (
    <section
      aria-labelledby={headingId}
      className={planningWeekDaySectionClass(today, riskDay)}
      id={dayId}
    >
      <div className="w-11 shrink-0 text-center sm:w-12">
        <p className="text-label" id={headingId}>
          {format(date, 'EEE', { locale: fr })}
        </p>
        <p className={planningWeekDayNumberClass(today, riskDay)}>{format(date, 'd')}</p>
        {riskDay ? <p className="text-label text-signal-caution mt-0.5">Vigilance</p> : null}
      </div>

      <div className="min-w-0 flex-1 space-y-2.5">
        <PlanningWeekDayContent
          activities={activities}
          activityById={activityById}
          date={date}
          empty={empty}
          isPastDay={isPastDay}
          loading={loading}
          planned={planned}
          onAdd={onAdd}
          onEdit={onEdit}
          onPrefetch={onPrefetch}
        />
      </div>

      <Button
        aria-label={`Ajouter une séance le ${addLabel}`}
        className="shrink-0 self-start"
        disabled={loading}
        size="icon"
        variant="ghost"
        onClick={onAdd}
      >
        <Plus className="size-4" aria-hidden />
      </Button>
    </section>
  );
}
