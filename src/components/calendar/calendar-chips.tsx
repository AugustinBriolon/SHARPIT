import { BrickChipHeader } from '@/components/planning/brick-dialog';
import { activityTypeColors, activityTypeLabels } from '@/lib/format';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { intensityAccent } from '@/lib/sessions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';
import type { DayEvent } from './calendar-types';
import { setDragSessionId } from './calendar-utils';

export function GoogleEventChip({ dayEvent }: { dayEvent: DayEvent }) {
  const { event, isStart, isEnd } = dayEvent;
  const color = event.color ?? '#9ca3af';
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

export function ActivityChip({ activity }: { activity: ClientActivity }) {
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

export function BrickChip({
  sessions,
  onEdit,
  onOpen,
}: {
  sessions: ClientPlannedSession[];
  onEdit: (session: ClientPlannedSession) => void;
  onOpen: () => void;
}) {
  const totalMin = sessions.reduce((sum, p) => sum + (p.durationMin ?? 0), 0);
  const allDone = sessions.every((p) => p.completed && Boolean(p.activityId));

  return (
    <div
      className={cn(
        'bg-primary/5 rounded-md border p-1',
        allDone ? 'border-primary/50' : 'border-primary/30',
      )}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
    >
      <BrickChipHeader allDone={allDone} totalMin={totalMin} onOpen={onOpen} />
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

export function PlannedChip({
  session,
  onEdit,
}: {
  session: ClientPlannedSession;
  onEdit: () => void;
}) {
  const accent = session.intensity ? intensityAccent[session.intensity] : '#94a3b8';
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
      onDragEnd={() => setDragSessionId(null)}
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      onDragStart={() => {
        if (!done) setDragSessionId(session.id);
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
