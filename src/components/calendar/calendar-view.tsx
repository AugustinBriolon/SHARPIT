'use client';

import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarCog, Check, ChevronLeft, ChevronRight, Layers, Plus } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PlannedSessionDialog } from '@/components/planning/planned-session-dialog';
import { PageHeader } from '@/components/layout/sticky-header';
import { useMounted } from '@/hooks/use-mounted';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { buildCalendarMonth, weekDayLabels } from '@/lib/calendar';
import { groupPlannedSessions } from '@/lib/brick-sessions';
import type { GoogleCalendarEvent, GoogleCalendarInfo } from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { activityTypeColors, activityTypeLabels } from '@/lib/format';
import { intensityAccent } from '@/lib/sessions';
import { cn } from '@/lib/utils';
import {
  useActivities,
  useGoals,
  useGoogleCalendars,
  useGoogleEvents,
  usePlannedSessions,
  usePlannedSessionMutations,
} from '@/hooks/use-data';

const WEEK_OPTS = { weekStartsOn: 1 as const };

function getDayCellDateClassName(isToday: boolean, inMonth: boolean): string {
  if (isToday) {
    return 'bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full font-semibold';
  }
  if (inMonth) {
    return 'text-foreground';
  }
  return 'text-muted-foreground/50';
}

type DialogState =
  { mode: 'create'; date: Date } | { mode: 'edit'; session: ClientPlannedSession } | null;

export function CalendarView({ embedded = false }: { embedded?: boolean }) {
  const mounted = useMounted();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();
  const { update } = usePlannedSessionMutations();

  const gridStart = startOfWeek(startOfMonth(month), WEEK_OPTS);
  const gridEnd = endOfWeek(endOfMonth(month), WEEK_OPTS);
  const gridFrom = gridStart.toISOString();
  const gridTo = gridEnd.toISOString();

  const googleQuery = useGoogleEvents(gridFrom, gridTo);
  const googleConnected = googleQuery.data?.connected ?? false;
  const calendarsQuery = useGoogleCalendars(googleConnected);

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
    <PageHeader className="flex flex-wrap items-end justify-between gap-4" embedded={embedded}>
      <div>
        {!embedded && <p className="text-primary text-xs font-medium uppercase">Calendar</p>}
        <h1
          className={cn(
            'font-heading font-semibold capitalize',
            embedded ? 'text-xl' : 'mt-2 text-3xl',
          )}
        >
          {mounted ? format(month, 'MMMM yyyy', { locale: fr }) : 'Calendrier'}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {googleConnected && (
          <CalendarVisibilityMenu
            calendars={calendarsQuery.data ?? []}
            error={visibilityError}
            loading={calendarsQuery.isLoading}
            onToggle={toggleCalendarVisibility}
          />
        )}
        <Button
          aria-label="Mois précédent"
          disabled={!mounted}
          size="icon"
          variant="outline"
          onClick={() => setMonth((m) => subMonths(m, 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          disabled={!mounted}
          size="sm"
          variant="outline"
          onClick={() => setMonth(startOfMonth(new Date()))}
        >
          Aujourd&apos;hui
        </Button>
        <Button
          aria-label="Mois suivant"
          disabled={!mounted}
          size="icon"
          variant="outline"
          onClick={() => setMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button disabled={!mounted} onClick={() => setDialog({ mode: 'create', date: new Date() })}>
          <Plus className="size-4" />
          Planifier
        </Button>
      </div>
    </PageHeader>
  );

  if (!mounted || activitiesQuery.isLoading || plannedQuery.isLoading || goalsQuery.isLoading) {
    return (
      <div className="space-y-8">
        {header}
        <Skeleton className="h-[560px] w-full" />
      </div>
    );
  }

  const weeks = buildCalendarMonth(month, activitiesQuery.data ?? [], plannedQuery.data ?? []);

  // Activités déjà rattachées à une séance planifiée : on ne les affiche pas en
  // double — la pastille de la séance planifiée représente les deux.
  const linkedActivityIds = new Set(
    (plannedQuery.data ?? []).map((p) => p.activityId).filter((id): id is string => Boolean(id)),
  );

  async function handleDrop(dateKey: string, targetDate: Date) {
    setDragOver(null);
    const raw = dragData;
    if (!raw) return;
    const session = (plannedQuery.data ?? []).find((s) => s.id === raw);
    if (!session) return;
    if (format(new Date(session.date), 'yyyy-MM-dd') === dateKey) return;
    await update.mutateAsync({
      id: session.id,
      data: { date: targetDate },
    });
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="border-border/60 overflow-hidden rounded-xl border">
        <div className="border-border/60 bg-card/40 grid grid-cols-7 border-b">
          {weekDayLabels.map((d) => (
            <div
              key={d}
              className="text-muted-foreground px-3 py-2 text-center text-xs font-medium tracking-wider uppercase"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {weeks.flat().map((cell) => {
            const dateKey = format(cell.date, 'yyyy-MM-dd');
            return (
              <div
                key={dateKey}
                className={cn(
                  'border-border/40 min-h-28 cursor-pointer border-r border-b p-1.5 transition-colors last:border-r-0',
                  !cell.inMonth && 'bg-muted/20',
                  dragOver === dateKey && 'bg-primary/10',
                )}
                onClick={() => setDialog({ mode: 'create', date: cell.date })}
                onDragLeave={() => setDragOver((k) => (k === dateKey ? null : k))}
                onDrop={() => handleDrop(dateKey, cell.date)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(dateKey);
                }}
              >
                <div className="mb-1 flex h-5 items-center justify-between px-1">
                  <span
                    className={cn('text-xs', getDayCellDateClassName(cell.isToday, cell.inMonth))}
                  >
                    {cell.date.getDate()}
                  </span>
                </div>

                <div className="space-y-1">
                  {(eventsByDay[dateKey] ?? []).map((de) => (
                    <GoogleEventChip key={`${de.event.id}-${dateKey}`} dayEvent={de} />
                  ))}
                  {cell.activities
                    .filter((a) => !linkedActivityIds.has(a.id))
                    .map((a) => (
                      <ActivityChip key={a.id} activity={a} />
                    ))}
                  {groupPlannedSessions(cell.planned).map((item) =>
                    item.kind === 'single' ? (
                      <PlannedChip
                        key={item.session.id}
                        session={item.session}
                        onEdit={() => setDialog({ mode: 'edit', session: item.session })}
                      />
                    ) : (
                      <BrickChip
                        key={item.id}
                        sessions={item.sessions}
                        onEdit={(session) => setDialog({ mode: 'edit', session })}
                      />
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {dialog && (
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

// Variable module-level pour transporter l'id en drag natif (dataTransfer est
// indisponible pendant dragOver sur certains navigateurs).
let dragData: string | null = null;

interface DayEvent {
  event: GoogleCalendarEvent;
  isStart: boolean;
  isEnd: boolean;
}

/**
 * Regroupe les événements Google par jour "yyyy-MM-dd", en DÉPLIANT les
 * événements multi-jours sur chacun des jours qu'ils couvrent.
 */
function groupEventsByDay(events: GoogleCalendarEvent[]): Record<string, DayEvent[]> {
  const map: Record<string, DayEvent[]> = {};

  for (const e of events) {
    // Jour de début (clé locale "yyyy-MM-dd").
    const startKey = e.allDay ? e.start.slice(0, 10) : format(new Date(e.start), 'yyyy-MM-dd');

    // Jour de fin. Pour un all-day, la date de fin Google est EXCLUSIVE
    // (lendemain) → on retire 1 jour. Pour un événement horaire, on prend le
    // jour local de fin.
    let endKey: string;
    if (e.allDay) {
      const end = new Date(`${e.end.slice(0, 10)}T00:00:00`);
      end.setDate(end.getDate() - 1);
      endKey = format(end, 'yyyy-MM-dd');
    } else {
      endKey = format(new Date(e.end), 'yyyy-MM-dd');
    }
    if (endKey < startKey) endKey = startKey;

    // Itère du jour de début au jour de fin (max 60 jours par sécurité).
    const cursor = new Date(`${startKey}T00:00:00`);
    const last = new Date(`${endKey}T00:00:00`);
    let guard = 0;
    while (cursor <= last && guard < 60) {
      const key = format(cursor, 'yyyy-MM-dd');
      (map[key] ??= []).push({
        event: e,
        isStart: key === startKey,
        isEnd: key === endKey,
      });
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
  }

  // Tri : all-day d'abord, puis par heure de début.
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => {
      if (a.event.allDay !== b.event.allDay) return a.event.allDay ? -1 : 1;
      return a.event.start.localeCompare(b.event.start);
    });
  }
  return map;
}

function GoogleEventChip({ dayEvent }: { dayEvent: DayEvent }) {
  const { event, isStart, isEnd } = dayEvent;
  const color = event.color ?? '#9ca3af';
  // Heure affichée seulement le 1er jour d'un événement horaire.
  const time = event.allDay || !isStart ? null : format(new Date(event.start), 'HH:mm');
  const multiDay = !(isStart && isEnd);
  const label = multiDay && !isStart ? `… ${event.summary}` : event.summary;
  return (
    <div
      className="bg-muted/50 text-muted-foreground flex items-center gap-1 truncate rounded-md border-l-2 px-1.5 py-0.5 text-[11px]"
      style={{ borderLeftColor: color }}
      title={`${event.calendarName}${time ? ` · ${time}` : ''} — ${event.summary}`}
      onClick={(e) => e.stopPropagation()}
    >
      {time && <span className="shrink-0 tabular-nums opacity-70">{time}</span>}
      <span className="truncate">{label}</span>
    </div>
  );
}

function CalendarVisibilityMenu({
  calendars,
  loading,
  error,
  onToggle,
}: {
  calendars: GoogleCalendarInfo[];
  loading: boolean;
  error: string | null;
  onToggle: (calendarId: string, visible: boolean) => Promise<void>;
}) {
  const selectable = calendars.filter((c) => !c.isTarget);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button disabled={loading} size="sm" variant="outline">
            <CalendarCog className="size-4" />
            Calendriers
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Calendriers Google affichés</DropdownMenuLabel>
          {loading && <p className="text-muted-foreground px-2 py-1.5 text-xs">Chargement…</p>}
          {!loading && selectable.length === 0 && (
            <p className="text-muted-foreground px-2 py-1.5 text-xs">Aucun autre calendrier.</p>
          )}
          {selectable.map((c) => (
            <DropdownMenuCheckboxItem
              key={c.id}
              checked={!c.hidden}
              closeOnClick={false}
              onCheckedChange={(checked) => onToggle(c.id, checked)}
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: c.backgroundColor ?? '#9ca3af' }}
                />
                <span className="truncate">{c.summary}</span>
              </span>
            </DropdownMenuCheckboxItem>
          ))}
          {error && <p className="text-destructive px-2 py-1.5 text-xs">{error}</p>}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ActivityChip({ activity }: { activity: ClientActivity }) {
  return (
    <Link
      href={`/training/${activity.id}`}
      title={activity.title ?? activityTypeLabels[activity.type]}
      className={cn(
        'border-border/60 bg-card/80 hover:border-primary/40 block truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
        activityTypeColors[activity.type],
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {activity.title ?? activityTypeLabels[activity.type]}
    </Link>
  );
}

/**
 * Bloc « brick » : affiche les jambes d'un enchaînement comme une séquence
 * connectée (ex. Vélo → Course) plutôt que des séances indépendantes.
 */
function BrickChip({
  sessions,
  onEdit,
}: {
  sessions: ClientPlannedSession[];
  onEdit: (session: ClientPlannedSession) => void;
}) {
  const totalMin = sessions.reduce((sum, p) => sum + (p.durationMin ?? 0), 0);
  const allDone = sessions.every((p) => p.completed && Boolean(p.activityId));

  return (
    <div
      className={cn(
        'bg-primary/5 rounded-md border p-1',
        allDone ? 'border-primary/50' : 'border-primary/30',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-0.5 flex items-center gap-1 px-0.5">
        <Layers className="text-primary size-2.5" />
        <span className="text-primary text-[9px] font-semibold tracking-wider uppercase">
          Brick
        </span>
        {totalMin > 0 && (
          <span className="text-muted-foreground ml-auto shrink-0 text-[9px] tabular-nums">
            {totalMin} min
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1">
        {sessions.map((p, i) => (
          <Fragment key={p.id}>
            {i > 0 && <ChevronRight className="text-primary/50 size-2.5 shrink-0" />}
            <BrickLeg session={p} onEdit={() => onEdit(p)} />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function BrickLeg({ session, onEdit }: { session: ClientPlannedSession; onEdit: () => void }) {
  const accent = session.intensity ? intensityAccent[session.intensity] : '#94a3b8';
  const done = session.completed && Boolean(session.activityId);
  const label = session.title ?? activityTypeLabels[session.type];

  return (
    <button
      title={`${activityTypeLabels[session.type]}${session.durationMin ? ` · ${session.durationMin} min` : ''}${done ? ' — réalisée' : ''}`}
      type="button"
      className={cn(
        'hover:bg-muted/40 flex min-w-0 items-center gap-1 truncate rounded border px-1 py-0.5 text-left text-[11px]',
        done ? 'border-solid' : 'border-dashed bg-transparent',
      )}
      style={
        done ? { backgroundColor: `${accent}22`, borderColor: accent } : { borderColor: accent }
      }
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
    >
      {done ? (
        <Check className="size-3 shrink-0" style={{ color: accent }} />
      ) : (
        <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
      )}
      <span
        className={cn('truncate', done ? 'text-foreground font-medium' : 'text-muted-foreground')}
      >
        {label}
      </span>
    </button>
  );
}

function PlannedChip({ session, onEdit }: { session: ClientPlannedSession; onEdit: () => void }) {
  const accent = session.intensity ? intensityAccent[session.intensity] : '#94a3b8';

  // Séance réalisée ET liée à une activité : pastille unique « englobante »
  // (fond plein, check, score de conformité) au lieu d'un doublon prévu+réalisé.
  const done = session.completed && Boolean(session.activityId);
  const score = (session.analysis as { complianceScore?: number } | null)?.complianceScore;
  const label = session.title ?? activityTypeLabels[session.type];

  return (
    <button
      draggable={!done}
      title={`${label}${done ? ' — réalisée' : ''}`}
      type="button"
      className={cn(
        'hover:bg-muted/40 flex w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-left text-[11px]',
        done ? 'border-solid' : 'border-dashed bg-transparent',
      )}
      style={
        done ? { backgroundColor: `${accent}22`, borderColor: accent } : { borderColor: accent }
      }
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      onDragEnd={() => {
        dragData = null;
      }}
      onDragStart={() => {
        if (!done) dragData = session.id;
      }}
    >
      {done ? (
        <Check className="size-3 shrink-0" style={{ color: accent }} />
      ) : (
        <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
      )}
      <span
        className={cn('truncate', done ? 'text-foreground font-medium' : 'text-muted-foreground')}
      >
        {label}
      </span>
      {done && score != null && (
        <span className="text-muted-foreground ml-auto shrink-0 text-[10px] tabular-nums">
          {score}
        </span>
      )}
    </button>
  );
}
