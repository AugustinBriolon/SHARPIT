'use client';

import { BrickDialog } from '@/components/planning/brick-dialog';
import { PlannedSessionDialog } from '@/components/planning/planned-session-dialog';
import { PlanAdapter } from '@/components/coach/plan-adapter';
import { PlanGenerator } from '@/components/coach/plan-generator';
import { MacroPlanDialog } from '@/components/planning/macro-plan-dialog';
import {
  SessionsCoachMenu,
  type SessionsCoachAction,
} from '@/components/sessions/sessions-coach-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SkeletonCard,
  SkeletonEyebrow,
  SkeletonPill,
  SkeletonText,
} from '@/components/ui/skeleton-patterns';
import {
  useActivities,
  useGoals,
  useGoogleCalendars,
  useGoogleEvents,
  usePlannedSessionMutations,
  usePlannedSessions,
} from '@/hooks/use-data';
import { useMounted } from '@/hooks/use-mounted';
import { useIsMobile } from '@/hooks/use-viewport';
import { buildCalendarMonth, buildCalendarWeek } from '@/lib/calendar';
import { queryKeys } from '@/lib/query/keys';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import type { ClientPlannedSession } from '@/lib/query/types';
import { isAnyInitialQueryLoad } from '@/hooks/use-query-status';
import { useQueryClient } from '@tanstack/react-query';
import {
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarMonthGrid } from './calendar-month-grid';
import { CalendarToolbar } from './calendar-toolbar';
import type { DialogState } from './calendar-types';
import { CALENDAR_WEEK_OPTS } from './calendar-types';
import { CalendarWeekList } from './calendar-week-list';
import { calendarToolbarTitle, getDragSessionId, groupEventsByDay } from './calendar-utils';

function CalendarSkeleton({ showHeader }: { showHeader: boolean }) {
  return (
    <div className="space-y-4 lg:space-y-6">
      {showHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <SkeletonEyebrow className="w-24" />
            <Skeleton className="h-8 w-56 max-w-full rounded-full border-0" />
            <SkeletonText widths={['100%', '82%']} />
          </div>
          <div className="flex gap-2">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="size-10 rounded-xl" />
            <SkeletonPill className="w-24" />
          </div>
        </div>
      ) : null}
      <SkeletonCard className="space-y-3 p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={`label-${index}`} className="mx-auto h-3 w-6 rounded-full border-0" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, index) => (
            <div
              key={index}
              className="rounded-analysis border-border/40 min-h-24 space-y-2 border p-2"
            >
              <Skeleton className="h-3 w-5 rounded-full border-0" />
              <Skeleton className="h-3 w-full rounded-full border-0" />
              <Skeleton className="h-3 rounded-full border-0" style={{ width: '80%' }} />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}

export function CalendarView({
  embedded = false,
  showHeader = true,
  showCoachMenu = !embedded,
  showPlanButton = !embedded,
}: {
  embedded?: boolean;
  showHeader?: boolean;
  showCoachMenu?: boolean;
  showPlanButton?: boolean;
}) {
  const router = useRouter();
  const mounted = useMounted();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [weekAnchor, setWeekAnchor] = useState<Date>(() =>
    startOfWeek(new Date(), CALENDAR_WEEK_OPTS),
  );
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();
  const { update } = usePlannedSessionMutations();

  const gridStart = isMobile
    ? startOfWeek(weekAnchor, CALENDAR_WEEK_OPTS)
    : startOfWeek(startOfMonth(month), CALENDAR_WEEK_OPTS);
  const gridEnd = isMobile
    ? endOfWeek(weekAnchor, CALENDAR_WEEK_OPTS)
    : endOfWeek(endOfMonth(month), CALENDAR_WEEK_OPTS);
  const gridFrom = gridStart.toISOString();
  const gridTo = gridEnd.toISOString();

  const googleQuery = useGoogleEvents(gridFrom, gridTo);
  const calendarsQuery = useGoogleCalendars(true);
  const googleConnected =
    (calendarsQuery.data?.length ?? 0) > 0 || googleQuery.data?.connected === true;

  const hiddenCalendarIds = useMemo(
    () => new Set((calendarsQuery.data ?? []).filter((c) => c.hidden).map((c) => c.id)),
    [calendarsQuery.data],
  );

  const visibleGoogleEvents = useMemo(
    () => (googleQuery.data?.events ?? []).filter((e) => !hiddenCalendarIds.has(e.calendarId)),
    [googleQuery.data?.events, hiddenCalendarIds],
  );

  const eventsByDay = useMemo(() => groupEventsByDay(visibleGoogleEvents), [visibleGoogleEvents]);

  async function toggleCalendarVisibility(calendarId: string, visible: boolean) {
    setVisibilityError(null);
    const current = calendarsQuery.data ?? [];
    const nextHidden = !visible;
    const nextCalendars = current.map((c) =>
      c.id === calendarId ? { ...c, hidden: nextHidden } : c,
    );
    const hiddenIds = nextCalendars.filter((c) => c.hidden).map((c) => c.id);

    const previousCalendars = current;
    queryClient.setQueryData(queryKeys.googleCalendars, nextCalendars);

    try {
      const response = await fetch('/api/google/calendar-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hiddenCalendarIds: hiddenIds }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? 'Enregistrement échoué');
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.googleEvents(gridFrom, gridTo),
      });
    } catch (err) {
      queryClient.setQueryData(queryKeys.googleCalendars, previousCalendars);
      setVisibilityError(err instanceof Error ? err.message : "Impossible d'enregistrer");
    }
  }

  const [dialog, setDialog] = useState<DialogState>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [adapterOpen, setAdapterOpen] = useState(false);
  const [macroPlanOpen, setMacroPlanOpen] = useState(false);

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
    }
  }

  const header = showHeader ? (
    <CalendarToolbar
      calendars={calendarsQuery.data ?? []}
      calendarsLoading={calendarsQuery.isPending}
      coachMenu={showCoachMenu ? <SessionsCoachMenu onAction={handleCoachAction} /> : null}
      embedded={embedded}
      googleConnected={googleConnected}
      isMobile={isMobile}
      mounted={mounted}
      showPlanButton={showPlanButton}
      title={calendarToolbarTitle(isMobile, mounted, gridStart, gridEnd, month)}
      visibilityError={visibilityError}
      onPlan={() => setDialog({ mode: 'create', date: new Date() })}
      onToggleCalendar={toggleCalendarVisibility}
      onNext={() =>
        isMobile ? setWeekAnchor((w) => addWeeks(w, 1)) : setMonth((m) => addMonths(m, 1))
      }
      onPrev={() =>
        isMobile ? setWeekAnchor((w) => subWeeks(w, 1)) : setMonth((m) => subMonths(m, 1))
      }
      onToday={() => {
        const today = new Date();
        setMonth(startOfMonth(today));
        setWeekAnchor(startOfWeek(today, CALENDAR_WEEK_OPTS));
      }}
    />
  ) : null;

  if (!mounted || isAnyInitialQueryLoad([activitiesQuery, plannedQuery, goalsQuery])) {
    return <CalendarSkeleton showHeader={showHeader} />;
  }

  const weeks = buildCalendarMonth(month, activitiesQuery.data ?? [], plannedQuery.data ?? []);
  const weekDays = buildCalendarWeek(
    weekAnchor,
    activitiesQuery.data ?? [],
    plannedQuery.data ?? [],
  );

  const linkedActivityIds = useMemo(
    () =>
      new Set(
        (plannedQuery.data ?? [])
          .map((p) => p.activityId)
          .filter((id): id is string => Boolean(id)),
      ),
    [plannedQuery.data],
  );

  async function handleDrop(dateKey: string, targetDate: Date) {
    setDragOver(null);
    const sessionId = getDragSessionId();
    if (!sessionId) return;
    const session = (plannedQuery.data ?? []).find((s) => s.id === sessionId);
    if (!session) return;
    if (format(new Date(session.date), 'yyyy-MM-dd') === dateKey) return;
    await update.mutateAsync({
      id: session.id,
      data: { date: targetDate },
    });
  }

  function openEdit(session: ClientPlannedSession) {
    prefetchPlannedSessionDetail(queryClient, session.id);
    setDialog({ mode: 'edit', session });
  }

  function openBrick(sessions: ClientPlannedSession[]) {
    for (const session of sessions) {
      prefetchPlannedSessionDetail(queryClient, session.id);
    }
    setDialog({ mode: 'brick', sessions });
  }

  function onCreate(date: Date) {
    setDialog({ mode: 'create', date });
  }

  function onDragLeave() {
    setDragOver(null);
  }

  const dayHandlers = {
    dragOver,
    eventsByDay,
    linkedActivityIds,
    onCreate,
    onDragLeave,
    onDragOver: setDragOver,
    onDrop: handleDrop,
    onEdit: openEdit,
    onOpenBrick: openBrick,
    onPrefetch: (session: ClientPlannedSession) => {
      prefetchPlannedSessionDetail(queryClient, session.id);
    },
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {header}

      {isMobile ? (
        <CalendarWeekList days={weekDays} {...dayHandlers} />
      ) : (
        <CalendarMonthGrid weeks={weeks} {...dayHandlers} />
      )}

      {dialog?.mode === 'brick' && (
        <BrickDialog
          sessions={dialog.sessions}
          onClose={() => setDialog(null)}
          onEditLeg={(session) => {
            prefetchPlannedSessionDetail(queryClient, session.id);
            setDialog({ mode: 'edit', session });
          }}
        />
      )}

      {dialog && dialog.mode !== 'brick' && (
        <PlannedSessionDialog
          defaultDate={dialog.mode === 'create' ? dialog.date : undefined}
          goals={goalsQuery.data ?? []}
          session={dialog.mode === 'edit' ? dialog.session : undefined}
          onClose={() => setDialog(null)}
        />
      )}

      {generatorOpen && <PlanGenerator onClose={() => setGeneratorOpen(false)} />}
      {adapterOpen && <PlanAdapter onClose={() => setAdapterOpen(false)} />}
      {macroPlanOpen && (
        <MacroPlanDialog goals={goalsQuery.data ?? []} onClose={() => setMacroPlanOpen(false)} />
      )}
    </div>
  );
}
