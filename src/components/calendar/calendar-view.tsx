'use client';

import { BrickDialog } from '@/components/planning/brick-dialog';
import { PlannedSessionDialog } from '@/components/planning/planned-session-dialog';
import { Skeleton } from '@/components/ui/skeleton';
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
import { CalendarMonthGrid } from './calendar-month-grid';
import { CalendarToolbar } from './calendar-toolbar';
import type { DialogState } from './calendar-types';
import { CALENDAR_WEEK_OPTS } from './calendar-types';
import { CalendarWeekList } from './calendar-week-list';
import { calendarToolbarTitle, getDragSessionId, groupEventsByDay } from './calendar-utils';

export function CalendarView({ embedded = false }: { embedded?: boolean }) {
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

  const eventsByDay = groupEventsByDay(visibleGoogleEvents);

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
      await queryClient.invalidateQueries({
        queryKey: queryKeys.googleEvents(gridFrom, gridTo),
      });
    } catch (err) {
      queryClient.setQueryData(queryKeys.googleCalendars, previousCalendars);
      setVisibilityError(err instanceof Error ? err.message : "Impossible d'enregistrer");
    }
  }

  const [dialog, setDialog] = useState<DialogState>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const header = (
    <CalendarToolbar
      calendars={calendarsQuery.data ?? []}
      calendarsLoading={calendarsQuery.isPending}
      embedded={embedded}
      googleConnected={googleConnected}
      isMobile={isMobile}
      mounted={mounted}
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
  );

  if (!mounted || isAnyInitialQueryLoad([activitiesQuery, plannedQuery, goalsQuery])) {
    return (
      <div className="space-y-8">
        {header}
        <Skeleton className="h-[560px] w-full" />
      </div>
    );
  }

  const weeks = buildCalendarMonth(month, activitiesQuery.data ?? [], plannedQuery.data ?? []);
  const weekDays = buildCalendarWeek(
    weekAnchor,
    activitiesQuery.data ?? [],
    plannedQuery.data ?? [],
  );

  const linkedActivityIds = new Set(
    (plannedQuery.data ?? []).map((p) => p.activityId).filter((id): id is string => Boolean(id)),
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
    setDialog({ mode: 'edit', session });
  }

  function openBrick(sessions: ClientPlannedSession[]) {
    setDialog({ mode: 'brick', sessions });
  }

  const dayHandlers = {
    dragOver,
    eventsByDay,
    linkedActivityIds,
    onCreate: (date: Date) => setDialog({ mode: 'create', date }),
    onDragLeave: () => setDragOver(null),
    onDragOver: setDragOver,
    onDrop: handleDrop,
    onEdit: openEdit,
    onOpenBrick: openBrick,
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
          onEditLeg={(session) => setDialog({ mode: 'edit', session })}
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
    </div>
  );
}
