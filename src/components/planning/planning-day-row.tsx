'use client';

import { InstrumentListChip } from '@/components/ui/instruments/instrument-list-chip';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { groupPlannedSessions } from '@/lib/planned-session/brick/brick-sessions';
import { activityTypeLabels } from '@/lib/format';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { cn } from '@/lib/utils';
import { format, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Layers, Plus } from 'lucide-react';
import {
  firstOpenPlannedSessionId,
  plannedSessionMeta,
} from '@/components/planning/planning-day-row-helpers';

function DayDateColumn({ date, riskDay, today }: { date: Date; riskDay: boolean; today: boolean }) {
  return (
    <div className="w-11 shrink-0 text-center sm:w-12">
      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        {format(date, 'EEE', { locale: fr })}
      </p>
      <p
        className={cn(
          'mt-0.5 font-mono text-lg font-semibold tabular-nums',
          today && 'text-primary',
          riskDay && !today && 'text-signal-caution',
        )}
      >
        {format(date, 'd')}
      </p>
      {riskDay ? <p className="text-label text-signal-caution mt-0.5">Vigilance</p> : null}
    </div>
  );
}

function EmptyDayButton({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      className="border-analysis-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground pressable rounded-analysis min-h-11 w-full border border-dashed px-3 py-2.5 text-left text-sm lg:min-h-9"
      type="button"
      onClick={onAdd}
    >
      Repos — planifier
    </button>
  );
}

function PlanningSessionRow({
  session,
  goalTitle,
  primary = false,
  onEdit,
  onPrefetch,
}: {
  session: ClientPlannedSession;
  goalTitle?: string | null;
  primary?: boolean;
  onEdit: (session: ClientPlannedSession) => void;
  onPrefetch: (session: ClientPlannedSession) => void;
}) {
  const title = session.title?.trim() || activityTypeLabels[session.type];

  return (
    <InstrumentListChip
      activityType={session.type}
      done={session.completed}
      meta={plannedSessionMeta(session, goalTitle)}
      primary={primary && !session.completed}
      title={title}
      onClick={() => onEdit(session)}
      onFocus={() => onPrefetch(session)}
      onPointerEnter={() => onPrefetch(session)}
    />
  );
}

function PlannedGroupsList({
  groups,
  goalTitleById,
  mixed,
  primarySessionId,
  onEdit,
  onPrefetch,
}: {
  groups: ReturnType<typeof groupPlannedSessions>;
  goalTitleById: ReadonlyMap<string, string>;
  mixed: boolean;
  primarySessionId: string | null;
  onEdit: (session: ClientPlannedSession) => void;
  onPrefetch: (session: ClientPlannedSession) => void;
}) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {mixed ? <p className="text-label px-0.5">Planifié</p> : null}
      <ul className="space-y-2">
        {groups.map((item) => {
          if (item.kind === 'single') {
            const goalTitle = item.session.goalId
              ? (goalTitleById.get(item.session.goalId) ?? null)
              : null;
            return (
              <li key={item.session.id}>
                <PlanningSessionRow
                  goalTitle={goalTitle}
                  primary={item.session.id === primarySessionId}
                  session={item.session}
                  onEdit={onEdit}
                  onPrefetch={onPrefetch}
                />
              </li>
            );
          }
          return (
            <li key={item.id} className="space-y-1.5">
              <p className="text-label text-primary flex items-center gap-1 px-0.5">
                <Layers className="size-3" aria-hidden />
                Brick
              </p>
              <ul className="border-analysis-border/70 space-y-1.5 border-l pl-2.5">
                {item.sessions.map((s) => (
                  <li key={s.id}>
                    <PlanningSessionRow
                      goalTitle={s.goalId ? (goalTitleById.get(s.goalId) ?? null) : null}
                      primary={s.id === primarySessionId}
                      session={s}
                      onEdit={onEdit}
                      onPrefetch={onPrefetch}
                    />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CompletedActivitiesList({
  activities,
  mixed,
}: {
  activities: ClientActivity[];
  mixed: boolean;
}) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {mixed ? <p className="text-label px-0.5">Réalisé</p> : null}
      <ul className="space-y-2">
        {activities.map((a) => (
          <li key={a.id}>
            <InstrumentListChip
              activityType={a.type}
              href={`/activite/${a.id}`}
              meta={['Réalisé']}
              title={a.title?.trim() || activityTypeLabels[a.type]}
              done
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DayRowContent({
  activities,
  empty,
  goalTitleById,
  loading,
  mixed,
  onAdd,
  onEdit,
  onPrefetch,
  planned,
}: {
  activities: ClientActivity[];
  empty: boolean;
  goalTitleById: ReadonlyMap<string, string>;
  loading: boolean;
  mixed: boolean;
  onAdd: () => void;
  onEdit: (session: ClientPlannedSession) => void;
  onPrefetch: (session: ClientPlannedSession) => void;
  planned: ClientPlannedSession[];
}) {
  if (loading) {
    return (
      <div className="space-y-2 py-1">
        <Skeleton className="rounded-analysis h-12 w-full border-0" />
        <Skeleton className="rounded-analysis h-12 w-4/5 border-0" />
      </div>
    );
  }

  if (empty) {
    return <EmptyDayButton onAdd={onAdd} />;
  }

  const plannedGroups = groupPlannedSessions(planned);
  const primarySessionId = firstOpenPlannedSessionId(plannedGroups);

  return (
    <>
      <PlannedGroupsList
        goalTitleById={goalTitleById}
        groups={plannedGroups}
        mixed={mixed}
        primarySessionId={primarySessionId}
        onEdit={onEdit}
        onPrefetch={onPrefetch}
      />
      <CompletedActivitiesList activities={activities} mixed={mixed} />
    </>
  );
}

function planningDayRowSurfaceClass(today: boolean, riskDay: boolean): string {
  return cn(
    'flex gap-3 px-3 py-3 sm:gap-4 sm:px-4',
    today && 'bg-primary/4',
    riskDay && !today && 'bg-signal-caution/8',
    riskDay && today && 'bg-signal-caution/10',
  );
}

export function PlanningDayRow({
  date,
  planned,
  activities,
  goalTitleById,
  onAdd,
  onEdit,
  onPrefetch,
  loading = false,
  riskDay = false,
}: {
  date: Date;
  planned: ClientPlannedSession[];
  activities: ClientActivity[];
  goalTitleById: ReadonlyMap<string, string>;
  onAdd: () => void;
  onEdit: (session: ClientPlannedSession) => void;
  onPrefetch: (session: ClientPlannedSession) => void;
  loading?: boolean;
  riskDay?: boolean;
}) {
  const today = isToday(date);
  const empty = !loading && planned.length === 0 && activities.length === 0;
  const mixed = planned.length > 0 && activities.length > 0;

  return (
    <div
      className={planningDayRowSurfaceClass(today, riskDay)}
      title={riskDay ? 'Point de vigilance — projection' : undefined}
    >
      <DayDateColumn date={date} riskDay={riskDay} today={today} />

      <div className="min-w-0 flex-1 space-y-2">
        <DayRowContent
          activities={activities}
          empty={empty}
          goalTitleById={goalTitleById}
          loading={loading}
          mixed={mixed}
          planned={planned}
          onAdd={onAdd}
          onEdit={onEdit}
          onPrefetch={onPrefetch}
        />
      </div>

      <Button
        aria-label="Ajouter une séance"
        className="shrink-0 self-start"
        disabled={loading}
        size="icon"
        variant="ghost"
        onClick={onAdd}
      >
        <Plus className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
