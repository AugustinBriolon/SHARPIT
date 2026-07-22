import { BrickChipHeader } from '@/components/planning/brick/brick-dialog';
import { ActivityTypeIndicator } from '@/components/activity/activity-type-indicator';
import { activityTypeLabels } from '@/lib/format';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { intensityAccent } from '@/lib/planned-session/sessions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';
import type { DayEvent } from './calendar-types';
import { setDragSessionId } from './calendar-utils';

const NEUTRAL_ACCENT = 'var(--color-signal-neutral)';

export function GoogleEventChip({ dayEvent }: { dayEvent: DayEvent }) {
  const { event, isStart, isEnd } = dayEvent;
  const color = event.color ?? NEUTRAL_ACCENT;
  const time = event.allDay || !isStart ? null : format(new Date(event.start), 'HH:mm');
  const multiDay = !(isStart && isEnd);
  const label = multiDay && !isStart ? `… ${event.summary}` : event.summary;

  return (
    <div
      className="bg-muted/50 text-muted-foreground flex items-center gap-1 truncate rounded-[6px] border-l-2 px-1.5 py-0.5 text-[11px]"
      style={{ borderLeftColor: color }}
      title={`${event.calendarName}${time ? ` · ${time}` : ''} — ${event.summary}`}
      onClick={(e) => e.stopPropagation()}
    >
      {time && <span className="text-data shrink-0 opacity-70">{time}</span>}
      <span className="truncate">{label}</span>
    </div>
  );
}

export function ActivityChip({ activity }: { activity: ClientActivity }) {
  return (
    <Link
      className="border-analysis-border bg-analysis-surface-alt/70 hover:border-primary/40 text-foreground flex items-center gap-1 truncate rounded-[6px] border px-1.5 py-0.5 text-[11px] font-medium"
      href={`/training/${activity.id}`}
      title={activity.title ?? activityTypeLabels[activity.type]}
      onClick={(e) => e.stopPropagation()}
    >
      <ActivityTypeIndicator type={activity.type} variant="code" />
      <span className="truncate">{activity.title ?? activityTypeLabels[activity.type]}</span>
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
      className="border-analysis-border bg-analysis-surface-alt/70 rounded-[8px] border p-1"
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
  const accent = session.intensity ? intensityAccent[session.intensity] : NEUTRAL_ACCENT;
  const done = session.completed && Boolean(session.activityId);
  const label = session.title ?? activityTypeLabels[session.type];

  return (
    <button
      title={`${activityTypeLabels[session.type]}${session.durationMin ? ` · ${session.durationMin} min` : ''}${done ? ' — réalisée' : ''}`}
      type="button"
      className={cn(
        'border-analysis-border bg-analysis-surface hover:border-primary/30 hover:bg-analysis-surface-alt flex min-w-0 items-center gap-1 truncate rounded-[6px] border px-1 py-0.5 text-left text-[11px]',
        done ? 'border-solid' : 'border-dashed',
      )}
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
    >
      <ActivityTypeIndicator type={session.type} variant="code" />
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
  onPrefetch,
}: {
  session: ClientPlannedSession;
  onEdit: () => void;
  onPrefetch?: () => void;
}) {
  const accent = session.intensity ? intensityAccent[session.intensity] : NEUTRAL_ACCENT;
  const done = session.completed && Boolean(session.activityId);
  const score = (session.analysis as { complianceScore?: number } | null)?.complianceScore;
  const label = session.title ?? activityTypeLabels[session.type];

  return (
    <button
      draggable={!done}
      title={`${label}${done ? ' — réalisée' : ''}`}
      type="button"
      className={cn(
        'border-analysis-border bg-analysis-surface-alt/70 hover:border-primary/30 hover:bg-analysis-surface flex w-full items-center gap-1 truncate rounded-[6px] border px-1.5 py-0.5 text-left text-[11px]',
        done ? 'border-solid' : 'border-dashed',
      )}
      onDragEnd={() => setDragSessionId(null)}
      onFocus={() => onPrefetch?.()}
      onPointerEnter={() => onPrefetch?.()}
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      onDragStart={() => {
        if (!done) setDragSessionId(session.id);
      }}
    >
      <ActivityTypeIndicator type={session.type} variant="code" />
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
        <span className="text-data text-muted-foreground ml-auto shrink-0 text-[10px]">
          {score}
        </span>
      )}
    </button>
  );
}
