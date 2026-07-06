'use client';

import { addWeeks, endOfWeek, format, isSameDay, isToday, startOfWeek, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle2, ChevronLeft, ChevronRight, Layers, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/sticky-header';
import { PlanAdapter } from '@/components/coach/plan-adapter';
import { PlanGenerator } from '@/components/coach/plan-generator';
import { MacroPlanDialog } from '@/components/planning/macro-plan-dialog';
import { PlanningCoachMenu } from '@/components/planning/planning-coach-menu';
import { PlannedSessionDialog } from '@/components/planning/planned-session-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClientActivity, ClientPlannedSession, ClientPlanWeek } from '@/lib/query/types';
import { groupPlannedSessions } from '@/lib/brick-sessions';
import { activityTypeColors, activityTypeLabels } from '@/lib/format';
import { buildPlanningWeeks, resolvePlanningWeek } from '@/lib/planning';
import { phaseColors, phaseLabels } from '@/lib/periodization';
import { formatPlannedDuration, intensityAccent } from '@/lib/sessions';
import { cn } from '@/lib/utils';
import { useActivities, useGoals, usePlannedSessions, useTrainingPlan } from '@/hooks/use-data';
import { isAnyInitialQueryLoad } from '@/hooks/use-query-status';

const WEEK_OPTS = { weekStartsOn: 1 as const };

type DialogState =
  { mode: 'create'; date: Date } | { mode: 'edit'; session: ClientPlannedSession } | null;

export function PlanningView({ embedded = false }: { embedded?: boolean }) {
  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();
  const planQuery = useTrainingPlan();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [adapterOpen, setAdapterOpen] = useState(false);
  const [macroPlanOpen, setMacroPlanOpen] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), WEEK_OPTS));

  const activities = activitiesQuery.data ?? [];
  const planned = plannedQuery.data ?? [];
  const goals = goalsQuery.data ?? [];

  const nextRace = useMemo(
    () =>
      goals
        .flatMap((g) =>
          g.kind === 'RACE' && !g.achieved && g.targetDate != null
            ? { goal: g, target: new Date(g.targetDate) }
            : [],
        )
        .filter(({ target }) => target >= new Date())
        .sort((a, b) => a.target.getTime() - b.target.getTime())[0],
    [goals],
  );

  const builtWeeks = useMemo(
    () => buildPlanningWeeks(activities, planned, nextRace?.target ?? null),
    [activities, planned, nextRace?.target],
  );

  const week = useMemo(
    () => resolvePlanningWeek(weekStart, activities, planned, nextRace?.target ?? null, builtWeeks),
    [weekStart, activities, planned, nextRace?.target, builtWeeks],
  );

  const planWeek = useMemo(() => {
    const plan = planQuery.data;
    if (!plan?.weeks) return undefined;
    const key = format(week.start, 'yyyy-MM-dd');
    return plan.weeks.find((w) => format(new Date(w.weekStart), 'yyyy-MM-dd') === key);
  }, [planQuery.data, week.start]);

  const days = useMemo(() => {
    return [...Array(7)].map((_, i) => {
      const date = new Date(week.start);
      date.setDate(date.getDate() + i);
      const dayPlanned = week.planned.filter((p) => isSameDay(new Date(p.date), date));
      const linkedIds = new Set(
        dayPlanned.map((p) => p.activityId).filter((id): id is string => id != null),
      );
      const dayActivities = week.activities.filter(
        (a) => isSameDay(new Date(a.date), date) && !linkedIds.has(a.id),
      );
      return { date, planned: dayPlanned, activities: dayActivities };
    });
  }, [week]);

  const isLoading = isAnyInitialQueryLoad([activitiesQuery, plannedQuery, goalsQuery]);
  const isCurrentWeek = week.index === 0;
  const weekEnd = endOfWeek(week.start, WEEK_OPTS);
  const completed = week.planned.filter((p) => p.completed).length;
  const total = week.planned.length;

  if (isLoading) {
    return (
      <div className="space-y-5">
        {!embedded && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-56" />
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-9 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-5 w-64" />
        <div className="border-border/60 overflow-hidden rounded-xl border">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className="border-border/60 h-14 w-full rounded-none border-b last:border-0"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!embedded && (
        <PageHeader>
          <div>
            <p className="text-primary text-xs font-medium uppercase">Planning</p>
            <h1 className="font-heading mt-2 text-3xl font-semibold">Plan d&apos;entraînement</h1>
            {nextRace && (
              <p className="text-muted-foreground mt-1 text-sm">
                {nextRace.goal.title} · {format(nextRace.target, 'd MMMM yyyy', { locale: fr })}
              </p>
            )}
          </div>
        </PageHeader>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            aria-label="Semaine précédente"
            size="icon"
            variant="ghost"
            onClick={() => setWeekStart((prev) => subWeeks(prev, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-[11rem] text-center">
            <p className="text-sm font-medium">
              {format(week.start, 'd MMM', { locale: fr })}
              {' — '}
              {format(weekEnd, 'd MMM', { locale: fr })}
            </p>
            {isCurrentWeek && (
              <p className="text-primary text-[11px] font-medium">Semaine en cours</p>
            )}
          </div>
          <Button
            aria-label="Semaine suivante"
            size="icon"
            variant="ghost"
            onClick={() => setWeekStart((prev) => addWeeks(prev, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <PlanningCoachMenu
            onAdapt={() => setAdapterOpen(true)}
            onGenerate={() => setGeneratorOpen(true)}
            onMacroPlan={() => setMacroPlanOpen(true)}
          />
          <Button onClick={() => setDialog({ mode: 'create', date: new Date() })}>
            <Plus className="size-4" />
            Séance
          </Button>
        </div>
      </div>

      <WeekSummary
        completed={completed}
        plannedLoad={week.plannedLoad}
        planWeek={planWeek}
        total={total}
        weeksToRace={week.weeksToRace}
      />

      <div className="border-border/60 divide-border/60 divide-y rounded-xl border">
        {days.map((day) => (
          <DayRow
            key={day.date.toISOString()}
            activities={day.activities}
            date={day.date}
            planned={day.planned}
            onAdd={() => setDialog({ mode: 'create', date: day.date })}
            onEdit={(session) => setDialog({ mode: 'edit', session })}
          />
        ))}
      </div>

      {dialog && (
        <PlannedSessionDialog
          defaultDate={dialog.mode === 'create' ? dialog.date : undefined}
          goals={goals}
          session={dialog.mode === 'edit' ? dialog.session : undefined}
          onClose={() => setDialog(null)}
        />
      )}

      {generatorOpen && <PlanGenerator onClose={() => setGeneratorOpen(false)} />}
      {adapterOpen && <PlanAdapter onClose={() => setAdapterOpen(false)} />}
      {macroPlanOpen && <MacroPlanDialog goals={goals} onClose={() => setMacroPlanOpen(false)} />}
    </div>
  );
}

function WeekSummary({
  planWeek,
  plannedLoad,
  completed,
  total,
  weeksToRace,
}: {
  planWeek?: ClientPlanWeek;
  plannedLoad: number;
  completed: number;
  total: number;
  weeksToRace: number | null;
}) {
  const hasMeta = (weeksToRace != null && weeksToRace >= 0) || planWeek != null || total > 0;
  if (!hasMeta) return null;

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
      {weeksToRace != null && weeksToRace >= 0 && (
        <span>{weeksToRace === 0 ? 'Semaine course' : `S-${weeksToRace}`}</span>
      )}
      {planWeek && (
        <>
          {weeksToRace != null && weeksToRace >= 0 && <span className="opacity-30">·</span>}
          <span style={{ color: phaseColors[planWeek.phase] }}>
            {phaseLabels[planWeek.phase]}
            {planWeek.isDeload ? ' · deload' : ''}
          </span>
        </>
      )}
      {total > 0 && (
        <>
          <span className="opacity-30">·</span>
          <span>
            {completed}/{total} séance{total > 1 ? 's' : ''}
          </span>
        </>
      )}
      {planWeek && (
        <>
          <span className="opacity-30">·</span>
          <span className="font-mono text-xs">
            {plannedLoad > 0
              ? `${Math.round(plannedLoad)} / ${planWeek.targetLoad} TSS`
              : `${planWeek.targetLoad} TSS cible`}
          </span>
        </>
      )}
    </div>
  );
}

function DayRow({
  date,
  planned,
  activities,
  onAdd,
  onEdit,
}: {
  date: Date;
  planned: ClientPlannedSession[];
  activities: ClientActivity[];
  onAdd: () => void;
  onEdit: (session: ClientPlannedSession) => void;
}) {
  const today = isToday(date);
  const empty = planned.length === 0 && activities.length === 0;

  return (
    <div className={cn('flex gap-3 px-3 py-3 sm:gap-4 sm:px-4', today && 'bg-primary/4')}>
      <div className="w-11 shrink-0 text-center sm:w-12">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {format(date, 'EEE', { locale: fr })}
        </p>
        <p
          className={cn(
            'mt-0.5 font-mono text-lg font-semibold tabular-nums',
            today && 'text-primary',
          )}
        >
          {format(date, 'd')}
        </p>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        {empty ? (
          <button
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            type="button"
            onClick={onAdd}
          >
            Repos — planifier
          </button>
        ) : (
          <>
            {groupPlannedSessions(planned).map((item) =>
              item.kind === 'single' ? (
                <SessionRow key={item.session.id} session={item.session} onEdit={onEdit} />
              ) : (
                <div key={item.id} className="space-y-1">
                  <p className="text-primary flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase">
                    <Layers className="size-3" /> Brick
                  </p>
                  {item.sessions.map((s) => (
                    <SessionRow key={s.id} session={s} onEdit={onEdit} />
                  ))}
                </div>
              ),
            )}
            {activities.map((a) => (
              <Link
                key={a.id}
                href={`/training/${a.id}`}
                className={cn(
                  'text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm',
                  activityTypeColors[a.type],
                )}
              >
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                <span className="truncate">{a.title ?? activityTypeLabels[a.type]}</span>
                <span className="text-xs opacity-70">réalisé</span>
              </Link>
            ))}
          </>
        )}
      </div>

      {/* <Button
        aria-label="Ajouter une séance"
        className="shrink-0 self-start"
        size="icon"
        variant="ghost"
        onClick={onAdd}
      >
        <Plus className="size-4" />
      </Button> */}
    </div>
  );
}

function SessionRow({
  session,
  onEdit,
}: {
  session: ClientPlannedSession;
  onEdit: (session: ClientPlannedSession) => void;
}) {
  const accent = session.intensity ? intensityAccent[session.intensity] : '#94a3b8';
  const title = session.title ?? activityTypeLabels[session.type];
  const meta = [
    session.startTime,
    session.durationMin != null ? formatPlannedDuration(session.durationMin) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      className={cn(
        'hover:bg-muted/50 flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
        session.completed && 'opacity-60',
      )}
      onClick={() => onEdit(session)}
    >
      {session.completed ? (
        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
      ) : (
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
      )}
      <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
      {meta && <span className="text-muted-foreground shrink-0 text-xs">{meta}</span>}
    </button>
  );
}
