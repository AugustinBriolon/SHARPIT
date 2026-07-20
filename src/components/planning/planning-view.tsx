'use client';

import { ActivityTypeIndicator } from '@/components/activity/activity-type-indicator';
import { PlanAdapter } from '@/components/coach/plan-adapter';
import { PlanGenerator } from '@/components/coach/plan-generator';
import { WeeklyBrief } from '@/components/coach/weekly-brief';
import { PageHeader } from '@/components/layout/sticky-header';
import { MacroPlanDialog } from '@/components/planning/macro-plan-dialog';
import { PlannedSessionDialog } from '@/components/planning/planned-session-dialog';
import { ProjectedAthleteCard } from '@/components/planning/projected-athlete-card';
import { ScenarioComparisonDialog } from '@/components/planning/scenario-comparison-dialog';
import { TravelContextBanner } from '@/components/planning/travel-context-banner';
import {
  SessionsCoachMenu,
  type SessionsCoachAction,
} from '@/components/sessions/sessions-coach-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonEyebrow, SkeletonTitle } from '@/components/ui/skeleton-patterns';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import { useActivities, useGoals, usePlannedSessions, useTrainingPlan } from '@/hooks/use-data';
import { useProjectedAthleteViewModel } from '@/hooks/use-projected-athlete-view-model';
import { isAnyInitialQueryLoad } from '@/hooks/use-query-status';
import { useScenarioComparisonViewModel } from '@/hooks/use-scenario-comparison-view-model';
import { groupPlannedSessions } from '@/lib/brick-sessions';
import { activityTypeLabels } from '@/lib/format';
import { phaseColors, phaseLabels } from '@/lib/periodization';
import { buildPlanningWeeks, resolvePlanningWeek } from '@/lib/planning';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import type { ClientActivity, ClientPlannedSession, ClientPlanWeek } from '@/lib/query/types';
import { formatPlannedDuration } from '@/lib/sessions';
import { cn } from '@/lib/utils';
import { addWeeks, endOfWeek, format, isSameDay, isToday, startOfWeek, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle2, ChevronLeft, ChevronRight, GitCompare, Layers, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const WEEK_OPTS = { weekStartsOn: 1 as const };

type DialogState =
  { mode: 'create'; date: Date } | { mode: 'edit'; session: ClientPlannedSession } | null;

export function PlanningView({
  embedded = false,
  showCoachMenu = !embedded,
}: {
  embedded?: boolean;
  showCoachMenu?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const plannedIdFromUrl = searchParams.get('planned');
  const createFromUrl = showCoachMenu && searchParams.has('create');
  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();
  const planQuery = useTrainingPlan();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [adapterOpen, setAdapterOpen] = useState(false);
  const [macroPlanOpen, setMacroPlanOpen] = useState(false);
  const [weeklyBriefOpen, setWeeklyBriefOpen] = useState(false);
  const [scenarioComparisonOpen, setScenarioComparisonOpen] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), WEEK_OPTS));
  const [projectionHorizon, setProjectionHorizon] = useState<ProjectionHorizonDays>(7);

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
  const showPlanningIntelligence = week.index >= 0;
  const anchorTrainingDayId = week.index > 0 ? format(week.start, 'yyyy-MM-dd') : undefined;
  const weekEnd = endOfWeek(week.start, WEEK_OPTS);
  const completed = week.planned.filter((p) => p.completed).length;
  const total = week.planned.length;
  const projectionQuery = useProjectedAthleteViewModel(projectionHorizon, anchorTrainingDayId);
  const scenarioComparisonQuery = useScenarioComparisonViewModel(7, anchorTrainingDayId);
  const hasActionableAlternative = Boolean(
    showPlanningIntelligence && scenarioComparisonQuery.data?.visible,
  );
  const projectionRiskDayId = showPlanningIntelligence
    ? (projectionQuery.data?.highestRiskTrainingDayId ?? null)
    : null;

  const deepLinkSession = useMemo(() => {
    if (!plannedIdFromUrl || plannedQuery.isPending) return null;
    return planned.find((s) => s.id === plannedIdFromUrl) ?? null;
  }, [plannedIdFromUrl, plannedQuery.isPending, planned]);

  useEffect(() => {
    if (!plannedIdFromUrl) return;
    prefetchPlannedSessionDetail(queryClient, plannedIdFromUrl);
  }, [plannedIdFromUrl, queryClient]);

  useEffect(() => {
    if (!deepLinkSession) return;
    const sessionWeek = startOfWeek(new Date(deepLinkSession.date), WEEK_OPTS);
    setWeekStart((current) => (isSameDay(current, sessionWeek) ? current : sessionWeek));
  }, [deepLinkSession]);

  function openPlannedSession(session: ClientPlannedSession) {
    prefetchPlannedSessionDetail(queryClient, session.id);
    setDialog({ mode: 'edit', session });
  }

  function prefetchPlannedSession(session: ClientPlannedSession) {
    prefetchPlannedSessionDetail(queryClient, session.id);
  }

  function closePlannedDialog() {
    setDialog(null);
    const params = new URLSearchParams(searchParams.toString());
    const hadPlanned = params.has('planned');
    const hadCreate = showCoachMenu && params.has('create');
    if (!hadPlanned && !hadCreate) return;
    params.delete('planned');
    if (hadCreate) params.delete('create');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleCoachAction(action: SessionsCoachAction) {
    switch (action) {
      case 'plan':
        setDialog({ mode: 'create', date: new Date() });
        break;
      case 'manual':
        router.push('/training/manual');
        break;
      case 'generate':
        setGeneratorOpen(true);
        break;
      case 'adapt':
        setAdapterOpen(true);
        break;
      case 'macro':
        setMacroPlanOpen(true);
        break;
      case 'week-brief':
        setWeeklyBriefOpen(true);
        break;
    }
  }

  const isCreateDialog = dialog?.mode === 'create' || createFromUrl;
  const showPlannedDialog = isCreateDialog || dialog?.mode === 'edit' || deepLinkSession != null;
  const editSession = dialog?.mode === 'edit' ? dialog.session : deepLinkSession;
  const createDefaultDate = dialog?.mode === 'create' ? dialog.date : new Date();

  if (isLoading) {
    return (
      <div className="space-y-5">
        {!embedded && (
          <div className="space-y-2">
            <SkeletonEyebrow className="w-20" />
            <SkeletonTitle className="h-9 w-64 max-w-full" size="md" />
            <Skeleton className="h-4 w-48 max-w-full rounded-full border-0" />
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Skeleton className="size-9 rounded-lg" />
            <div className="min-w-44 space-y-1.5 text-center">
              <Skeleton className="mx-auto h-4 w-36 rounded-full border-0" />
              <Skeleton className="mx-auto h-3 w-24 rounded-full border-0" />
            </div>
            <Skeleton className="size-9 rounded-lg" />
          </div>
          {!embedded ? <Skeleton className="h-9 w-32 rounded-lg" /> : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Skeleton className="h-4 w-10 rounded-full border-0" />
          <Skeleton className="h-4 w-24 rounded-full border-0" />
          <Skeleton className="h-4 w-28 rounded-full border-0" />
        </div>

        <section className="analysis-panel-alt rounded-analysis-lg px-5 py-5 sm:px-6">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded-sm" />
            <Skeleton className="h-3 w-28 rounded-full border-0" />
          </div>
          <Skeleton className="mt-3 h-6 w-full max-w-3xl rounded-full border-0 sm:h-7" />
          <div className="mt-4 flex flex-wrap gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-12 rounded-md" />
            ))}
          </div>
          <Skeleton className="mt-4 h-9 w-44 rounded-lg" />
        </section>

        <div className="analysis-panel divide-analysis-border rounded-analysis-lg divide-y overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-3 py-3 sm:gap-4 sm:px-4">
              <div className="w-11 shrink-0 space-y-1 text-center sm:w-12">
                <Skeleton className="mx-auto h-2.5 w-8 rounded-full border-0" />
                <Skeleton className="mx-auto h-7 w-8 rounded-lg border-0" />
              </div>
              <div className="min-w-0 flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-28 rounded-full border-0" />
              </div>
            </div>
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
            <p className="text-label">Planning</p>
            <h1 className="text-page-title mt-1">Plan d&apos;entraînement</h1>
            {nextRace && (
              <p className="text-muted-foreground mt-1 text-sm">
                {nextRace.goal.title} · {format(nextRace.target, 'd MMMM yyyy', { locale: fr })}
              </p>
            )}
          </div>
        </PageHeader>
      )}

      <TravelContextBanner rangeEnd={weekEnd} rangeStart={week.start} />

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
          <div className="min-w-44 text-center">
            <p className="text-sm font-medium">
              {format(week.start, 'd MMM', { locale: fr })}
              {' — '}
              {format(weekEnd, 'd MMM', { locale: fr })}
            </p>
            {isCurrentWeek && (
              <p className="text-primary text-[11px] font-medium">Semaine en cours</p>
            )}
            {week.index > 0 && (
              <p className="text-muted-foreground text-[11px] font-medium">Semaine à venir</p>
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

        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasActionableAlternative ? (
            <Button size="sm" variant="outline" onClick={() => setScenarioComparisonOpen(true)}>
              <GitCompare className="size-3.5 shrink-0" />
              <span className="max-w-48 truncate">
                {scenarioComparisonQuery.data?.recommendedScenarioLabel ??
                  'Alternative recommandée'}
              </span>
            </Button>
          ) : null}
          {showCoachMenu ? <SessionsCoachMenu onAction={handleCoachAction} /> : null}
        </div>
      </div>

      <WeekSummary
        completed={completed}
        plannedLoad={week.plannedLoad}
        planWeek={planWeek}
        total={total}
        weeksToRace={week.weeksToRace}
      />

      {showPlanningIntelligence ? (
        <ProjectedAthleteCard
          horizon={projectionHorizon}
          query={projectionQuery}
          onHorizonChange={setProjectionHorizon}
        />
      ) : null}

      <div className="analysis-panel divide-analysis-border rounded-analysis-lg divide-y overflow-hidden">
        {days.map((day) => (
          <DayRow
            key={day.date.toISOString()}
            activities={day.activities}
            date={day.date}
            planned={day.planned}
            onAdd={() => setDialog({ mode: 'create', date: day.date })}
            onEdit={openPlannedSession}
            onPrefetch={prefetchPlannedSession}
          />
        ))}
      </div>

      {showPlannedDialog && (
        <PlannedSessionDialog
          defaultDate={isCreateDialog ? createDefaultDate : undefined}
          goals={goals}
          session={editSession ?? undefined}
          onClose={closePlannedDialog}
        />
      )}

      {generatorOpen && <PlanGenerator onClose={() => setGeneratorOpen(false)} />}
      {adapterOpen && <PlanAdapter onClose={() => setAdapterOpen(false)} />}
      {macroPlanOpen && <MacroPlanDialog goals={goals} onClose={() => setMacroPlanOpen(false)} />}
      {weeklyBriefOpen && <WeeklyBrief onClose={() => setWeeklyBriefOpen(false)} />}
      {scenarioComparisonOpen ? (
        <ScenarioComparisonDialog
          isLoading={scenarioComparisonQuery.isLoading}
          open={scenarioComparisonOpen}
          viewModel={scenarioComparisonQuery.data}
          onClose={() => setScenarioComparisonOpen(false)}
        />
      ) : null}
    </div>
  );
}

function WeekSummary({
  planWeek,
  plannedLoad,
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
      {planWeek ? (
        <>
          <span className="opacity-30">·</span>
          <span className="font-mono text-xs">
            {plannedLoad > 0
              ? `${Math.round(plannedLoad)} / ${planWeek.targetLoad} TSS`
              : `${planWeek.targetLoad} TSS cible`}
          </span>
        </>
      ) : null}
      {!planWeek && total > 0 ? (
        <>
          <span className="opacity-30">·</span>
          <span>
            {total} séance{total > 1 ? 's' : ''} planifiée{total > 1 ? 's' : ''}
          </span>
        </>
      ) : null}
    </div>
  );
}

function DayRow({
  date,
  planned,
  activities,
  onAdd,
  onEdit,
  onPrefetch,
}: {
  date: Date;
  planned: ClientPlannedSession[];
  activities: ClientActivity[];
  onAdd: () => void;
  onEdit: (session: ClientPlannedSession) => void;
  onPrefetch: (session: ClientPlannedSession) => void;
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
            className="text-muted-foreground hover:text-foreground pl-6 text-sm transition-colors"
            type="button"
            onClick={onAdd}
          >
            Repos — planifier
          </button>
        ) : (
          <>
            {groupPlannedSessions(planned).map((item) =>
              item.kind === 'single' ? (
                <SessionRow
                  key={item.session.id}
                  session={item.session}
                  onEdit={onEdit}
                  onPrefetch={onPrefetch}
                />
              ) : (
                <div key={item.id} className="space-y-1">
                  <p className="text-primary flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase">
                    <Layers className="size-3" /> Brick
                  </p>
                  {item.sessions.map((s) => (
                    <SessionRow key={s.id} session={s} onEdit={onEdit} onPrefetch={onPrefetch} />
                  ))}
                </div>
              ),
            )}
            {activities.map((a) => (
              <Link
                key={a.id}
                className="text-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
                href={`/training/${a.id}`}
              >
                <CheckCircle2 className="text-primary size-3.5 shrink-0" />
                <ActivityTypeIndicator type={a.type} />
                <span className="truncate">{a.title ?? activityTypeLabels[a.type]}</span>
                <span className="text-muted-foreground text-xs">réalisé</span>
              </Link>
            ))}
          </>
        )}
      </div>

      <Button
        aria-label="Ajouter une séance"
        className="shrink-0 self-start"
        size="icon"
        variant="ghost"
        onClick={onAdd}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

function SessionRow({
  session,
  onEdit,
  onPrefetch,
}: {
  session: ClientPlannedSession;
  onEdit: (session: ClientPlannedSession) => void;
  onPrefetch: (session: ClientPlannedSession) => void;
}) {
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
        'hover:bg-muted/50 flex w-full items-center gap-2.5 rounded-lg py-1.5 pl-6 text-left text-sm transition-colors',
        session.completed && 'pl-0 opacity-60',
      )}
      onClick={() => onEdit(session)}
      onFocus={() => onPrefetch(session)}
      onPointerEnter={() => onPrefetch(session)}
    >
      {session.completed && <CheckCircle2 className="text-primary size-3.5 shrink-0" />}
      <ActivityTypeIndicator type={session.type} />
      <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
      {meta && <span className="text-muted-foreground shrink-0 text-xs">{meta}</span>}
    </button>
  );
}
