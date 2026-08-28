'use client';

/** `?date=2026-08-23` from a deep link, or nothing if it is not a plain day. */
function parseCalendarDateParam(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

import { PageHeader } from '@/components/layout/sticky-header';
import { TravelContextBanner } from '@/components/planning/travel-context-banner';
import { SessionsCoachMenu, type SessionsCoachAction } from '@/components/coaching/coach-menu';
import { Button } from '@/components/ui/button';
import {
  InstrumentListChip,
  type InstrumentListChipMeta,
} from '@/components/ui/instruments/instrument-list-chip';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import { useActivities, useGoals, usePlannedSessions, useTrainingPlan } from '@/hooks/use-data';
import { useProjectedAthleteViewModel } from '@/hooks/use-projected-athlete-view-model';
import { isAnyInitialQueryLoad } from '@/hooks/use-query-status';
import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
import { useScenarioComparisonViewModel } from '@/hooks/use-scenario-comparison-view-model';
import { groupPlannedSessions } from '@/lib/planned-session/brick/brick-sessions';
import { activityTypeLabels } from '@/lib/format';
import { phaseColors, phaseLabels } from '@/lib/training/periodization';
import { buildPlanningWeeks, resolvePlanningWeek } from '@/lib/planned-session/planning';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import { formatTrainingLoad } from '@/lib/preferences/display-mode';
import { useDisplayMode } from '@/providers/display-mode-provider';
import type { ClientActivity, ClientPlannedSession, ClientPlanWeek } from '@/lib/query/types';
import { formatPlannedDuration } from '@/lib/planned-session/sessions';
import { cn } from '@/lib/utils';
import { addWeeks, endOfWeek, format, isSameDay, isToday, startOfWeek, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, GitCompare, Layers, Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EMPTY_GOALS } from '@/components/planning/session/session-defaults';

const PlannedSessionDialog = dynamic(
  () =>
    import('@/components/planning/session/edit/planned-session-dialog').then(
      (mod) => mod.PlannedSessionDialog,
    ),
  { ssr: false },
);
const PlanGenerator = dynamic(
  () => import('@/components/coach/plan/plan-generator').then((mod) => mod.PlanGenerator),
  { ssr: false },
);
const PlanAdapter = dynamic(
  () => import('@/components/coach/plan/plan-adapter').then((mod) => mod.PlanAdapter),
  { ssr: false },
);
const MacroPlanDialog = dynamic(
  () => import('@/components/planning/macro-plan-dialog').then((mod) => mod.MacroPlanDialog),
  { ssr: false },
);
const WeeklyBrief = dynamic(
  () => import('@/components/coach/weekly-brief').then((mod) => mod.WeeklyBrief),
  { ssr: false },
);
const ScenarioComparisonDialog = dynamic(
  () =>
    import('@/components/planning/scenario/scenario-comparison-dialog').then(
      (mod) => mod.ScenarioComparisonDialog,
    ),
  { ssr: false },
);

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

  // Returning to the plan should not reopen the scenario comparison.
  useResetWhenHidden(() => setScenarioComparisonOpen(false));
  // Deep-link from the /training week strip: frame the view on the requested week.
  const weekFromUrl = parseCalendarDateParam(searchParams.get('week'));
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(weekFromUrl ?? new Date(), WEEK_OPTS),
  );
  // Card that read this is gone; the risk-day tint on the week list is the
  // only remaining consumer, and it never lets the athlete change the horizon.
  const projectionHorizon: ProjectionHorizonDays = 7;

  const activities = activitiesQuery.data ?? [];
  const planned = plannedQuery.data ?? [];
  const goals = goalsQuery.data ?? EMPTY_GOALS;
  const goalTitleById = useMemo(() => new Map(goals.map((g) => [g.id, g.title] as const)), [goals]);

  const nextRace = useMemo(
    () =>
      goals
        .flatMap((g) =>
          g.kind === 'RACE' && !g.achieved && g.targetDate !== null
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
    () =>
      resolvePlanningWeek({
        weekStart,
        activities,
        planned,
        raceDate: nextRace?.target ?? null,
        builtWeeks,
      }),
    [weekStart, activities, planned, nextRace?.target, builtWeeks],
  );

  const planWeek = useMemo(() => {
    const plan = planQuery.data;
    if (!plan?.weeks) {
      return undefined;
    }
    const key = format(week.start, 'yyyy-MM-dd');
    return plan.weeks.find((w) => format(new Date(w.weekStart), 'yyyy-MM-dd') === key);
  }, [planQuery.data, week.start]);

  const days = useMemo(() => {
    return [...Array(7)].map((_, i) => {
      const date = new Date(week.start);
      date.setDate(date.getDate() + i);
      const dayPlanned = week.planned.filter((p) => isSameDay(new Date(p.date), date));
      const linkedIds = new Set(
        dayPlanned.map((p) => p.activityId).filter((id): id is string => id !== null),
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
    showPlanningIntelligence && !isLoading && scenarioComparisonQuery.data?.visible,
  );

  const deepLinkSession = useMemo(() => {
    if (!plannedIdFromUrl || plannedQuery.isPending) {
      return null;
    }
    return planned.find((s) => s.id === plannedIdFromUrl) ?? null;
  }, [plannedIdFromUrl, plannedQuery.isPending, planned]);

  useEffect(() => {
    if (!plannedIdFromUrl) {
      return;
    }
    prefetchPlannedSessionDetail(queryClient, plannedIdFromUrl);
  }, [plannedIdFromUrl, queryClient]);

  useEffect(() => {
    if (!deepLinkSession) {
      return;
    }
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
    if (!hadPlanned && !hadCreate) {
      return;
    }
    params.delete('planned');
    if (hadCreate) {
      params.delete('create');
    }
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
  const showPlannedDialog = isCreateDialog || dialog?.mode === 'edit' || deepLinkSession !== null;
  const editSession = dialog?.mode === 'edit' ? dialog.session : deepLinkSession;
  const createDefaultDate = dialog?.mode === 'create' ? dialog.date : new Date();

  return (
    <div className="space-y-5">
      {!embedded && (
        <PageHeader>
          <div>
            <p className="text-label">Planning</p>
            <h1 className="text-page-title mt-1">Plan d&apos;entraînement</h1>
            {isLoading && <Skeleton className="mt-1 h-4 w-48 max-w-full rounded-full border-0" />}
            {!isLoading && nextRace ? (
              <p className="text-muted-foreground mt-1 text-sm">
                {nextRace.goal.title} · {format(nextRace.target, 'd MMMM yyyy', { locale: fr })}
              </p>
            ) : null}
          </div>
        </PageHeader>
      )}

      {/* Week chrome: nav first (full width mobile), actions second row — thumbs / scan. */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-1 sm:justify-start sm:gap-1">
          <Button
            aria-label="Semaine précédente"
            className="size-11 shrink-0 lg:size-9"
            size="icon"
            variant="ghost"
            onClick={() => setWeekStart((prev) => subWeeks(prev, 1))}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <div className="min-w-0 flex-1 text-center sm:min-w-44 sm:flex-none">
            <p className="text-sm font-medium text-balance">
              {format(week.start, 'd MMM', { locale: fr })}
              {' — '}
              {format(weekEnd, 'd MMM', { locale: fr })}
            </p>
            {isCurrentWeek && <p className="text-primary text-xs font-medium">Semaine en cours</p>}
            {week.index > 0 && (
              <p className="text-muted-foreground text-xs font-medium">Semaine à venir</p>
            )}
          </div>
          <Button
            aria-label="Semaine suivante"
            className="size-11 shrink-0 lg:size-9"
            size="icon"
            variant="ghost"
            onClick={() => setWeekStart((prev) => addWeeks(prev, 1))}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="flex [scrollbar-width:none] items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {!isLoading ? (
            <TravelContextBanner
              className="max-w-[9.5rem] sm:max-w-56"
              rangeEnd={weekEnd}
              rangeStart={week.start}
            />
          ) : null}
          {hasActionableAlternative ? (
            <Button
              aria-label="Comparer les scénarios"
              className="shrink-0"
              size="sm"
              variant="outline"
              onClick={() => setScenarioComparisonOpen(true)}
            >
              <GitCompare className="size-3.5 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Comparer</span>
            </Button>
          ) : null}
          {showCoachMenu ? (
            <div className="ml-auto shrink-0">
              <SessionsCoachMenu onAction={handleCoachAction} />
            </div>
          ) : null}
        </div>
      </div>

      <WeekSummary
        completed={completed}
        loading={isLoading}
        plannedLoad={week.plannedLoad}
        planWeek={planWeek}
        total={total}
        weeksToRace={week.weeksToRace}
      />

      <div className="analysis-panel divide-analysis-border rounded-analysis-lg divide-y overflow-hidden">
        {days.map((day) => {
          const dayId = format(day.date, 'yyyy-MM-dd');
          return (
            <DayRow
              key={day.date.toISOString()}
              activities={day.activities}
              date={day.date}
              goalTitleById={goalTitleById}
              loading={isLoading}
              planned={day.planned}
              riskDay={
                showPlanningIntelligence && projectionQuery.data?.highestRiskTrainingDayId === dayId
              }
              onAdd={() => setDialog({ mode: 'create', date: day.date })}
              onEdit={openPlannedSession}
              onPrefetch={prefetchPlannedSession}
            />
          );
        })}
      </div>

      {showPlannedDialog && !isLoading && (
        <PlannedSessionDialog
          defaultDate={isCreateDialog ? createDefaultDate : undefined}
          goals={goals}
          session={editSession ?? undefined}
          onClose={closePlannedDialog}
        />
      )}

      {generatorOpen ? <PlanGenerator onClose={() => setGeneratorOpen(false)} /> : null}
      {adapterOpen ? <PlanAdapter onClose={() => setAdapterOpen(false)} /> : null}
      {macroPlanOpen ? (
        <MacroPlanDialog goals={goals} onClose={() => setMacroPlanOpen(false)} />
      ) : null}
      {weeklyBriefOpen ? <WeeklyBrief onClose={() => setWeeklyBriefOpen(false)} /> : null}
      {scenarioComparisonOpen ? (
        <ScenarioComparisonDialog
          anchorTrainingDayId={anchorTrainingDayId}
          isLoading={scenarioComparisonQuery.isPending || scenarioComparisonQuery.isPlaceholderData}
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
  loading = false,
}: {
  planWeek?: ClientPlanWeek;
  plannedLoad: number;
  completed: number;
  total: number;
  weeksToRace: number | null;
  loading?: boolean;
}) {
  const { mode } = useDisplayMode();
  if (loading) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Skeleton className="h-4 w-10 rounded-full border-0" />
        <Skeleton className="h-4 w-24 rounded-full border-0" />
        <Skeleton className="h-4 w-28 rounded-full border-0" />
      </div>
    );
  }

  const hasMeta = (weeksToRace !== null && weeksToRace >= 0) || planWeek !== null || total > 0;
  if (!hasMeta) {
    return null;
  }

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
      {weeksToRace !== null && weeksToRace >= 0 && (
        <span>{weeksToRace === 0 ? 'Semaine course' : `S-${weeksToRace}`}</span>
      )}
      {planWeek && (
        <>
          {weeksToRace !== null && weeksToRace >= 0 && <span className="opacity-30">·</span>}
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
              ? `${formatTrainingLoad(plannedLoad, mode)} / ${formatTrainingLoad(planWeek.targetLoad, mode)}`
              : `${formatTrainingLoad(planWeek.targetLoad, mode)} cible`}
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
  /** Projection highest-risk day — tint only, no competing card chrome. */
  riskDay?: boolean;
}) {
  const today = isToday(date);
  const empty = !loading && planned.length === 0 && activities.length === 0;
  const mixed = planned.length > 0 && activities.length > 0;
  const plannedGroups = groupPlannedSessions(planned);
  const primarySessionId = firstOpenPlannedSessionId(plannedGroups);

  return (
    <div
      title={riskDay ? 'Point de vigilance — projection' : undefined}
      className={cn(
        'flex gap-3 px-3 py-3 sm:gap-4 sm:px-4',
        today && 'bg-primary/4',
        riskDay && !today && 'bg-signal-caution/8',
        riskDay && today && 'bg-signal-caution/10',
      )}
    >
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

      <div className="min-w-0 flex-1 space-y-2">
        {loading && (
          <div className="space-y-2 py-1">
            <Skeleton className="rounded-analysis h-12 w-full border-0" />
            <Skeleton className="rounded-analysis h-12 w-4/5 border-0" />
          </div>
        )}
        {!loading && empty ? (
          <button
            className="border-analysis-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground pressable rounded-analysis min-h-11 w-full border border-dashed px-3 py-2.5 text-left text-sm lg:min-h-9"
            type="button"
            onClick={onAdd}
          >
            Repos — planifier
          </button>
        ) : null}
        {!loading && !empty ? (
          <>
            {plannedGroups.length > 0 ? (
              <div className="space-y-2">
                {mixed ? <p className="text-label px-0.5">Planifié</p> : null}
                <ul className="space-y-2">
                  {plannedGroups.map((item) => {
                    if (item.kind === 'single') {
                      return (
                        <li key={item.session.id}>
                          <SessionRow
                            primary={item.session.id === primarySessionId}
                            session={item.session}
                            goalTitle={
                              item.session.goalId
                                ? (goalTitleById.get(item.session.goalId) ?? null)
                                : null
                            }
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
                              <SessionRow
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
            ) : null}

            {activities.length > 0 ? (
              <div className="space-y-2">
                {mixed ? <p className="text-label px-0.5">Réalisé</p> : null}
                <ul className="space-y-2">
                  {activities.map((a) => (
                    <li key={a.id}>
                      <InstrumentListChip
                        activityType={a.type}
                        href={`/training/${a.id}`}
                        meta={['Réalisé']}
                        title={a.title?.trim() || activityTypeLabels[a.type]}
                        done
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
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

function firstOpenPlannedSessionId(groups: ReturnType<typeof groupPlannedSessions>): string | null {
  for (const item of groups) {
    if (item.kind === 'single' && !item.session.completed) {
      return item.session.id;
    }
    if (item.kind === 'brick') {
      const open = item.sessions.find((s) => !s.completed);
      if (open) {
        return open.id;
      }
    }
  }
  return null;
}

function plannedSessionMeta(
  session: ClientPlannedSession,
  goalTitle?: string | null,
): InstrumentListChipMeta[] {
  const meta: InstrumentListChipMeta[] = [];
  if (session.startTime) {
    meta.push(session.startTime);
  }
  if (session.durationMin !== null) {
    meta.push(formatPlannedDuration(session.durationMin));
  }
  if (goalTitle) {
    meta.push(`Sert ${goalTitle}`);
  }
  return meta;
}

function SessionRow({
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
