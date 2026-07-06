import { weekDayLabels, type CalendarDay } from '@/lib/calendar';
import type { ClientPlannedSession } from '@/lib/query/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarDayContent } from './calendar-day-content';
import type { DayEvent } from './calendar-types';
import { getDayCellDateClassName } from './calendar-utils';

function CalendarMonthCell({
  cell,
  eventsByDay,
  linkedActivityIds,
  dragOver,
  onCreate,
  onDrop,
  onDragOver,
  onDragLeave,
  onEdit,
  onOpenBrick,
}: {
  cell: CalendarDay;
  eventsByDay: Record<string, DayEvent[]>;
  linkedActivityIds: Set<string>;
  dragOver: string | null;
  onCreate: (date: Date) => void;
  onDrop: (dateKey: string, date: Date) => void;
  onDragOver: (dateKey: string) => void;
  onDragLeave: () => void;
  onEdit: (session: ClientPlannedSession) => void;
  onOpenBrick: (sessions: ClientPlannedSession[]) => void;
}) {
  const dateKey = format(cell.date, 'yyyy-MM-dd');

  return (
    <div
      className={cn(
        'border-border/40 min-h-28 cursor-pointer border-r border-b p-1.5 transition-colors last:border-r-0',
        !cell.inMonth && 'bg-muted/20',
        dragOver === dateKey && 'bg-primary/10',
      )}
      onClick={() => onCreate(cell.date)}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(dateKey, cell.date)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(dateKey);
      }}
    >
      <div className="mb-1 flex h-5 items-center justify-between px-1">
        <span className={cn('text-xs', getDayCellDateClassName(cell.isToday, cell.inMonth))}>
          {cell.date.getDate()}
        </span>
      </div>
      <div className="space-y-1">
        <CalendarDayContent
          cell={cell}
          dateKey={dateKey}
          eventsByDay={eventsByDay}
          linkedActivityIds={linkedActivityIds}
          onEdit={onEdit}
          onOpenBrick={onOpenBrick}
        />
      </div>
    </div>
  );
}

export function CalendarMonthGrid({
  weeks,
  eventsByDay,
  linkedActivityIds,
  dragOver,
  onCreate,
  onDrop,
  onDragOver,
  onDragLeave,
  onEdit,
  onOpenBrick,
}: {
  weeks: CalendarDay[][];
  eventsByDay: Record<string, DayEvent[]>;
  linkedActivityIds: Set<string>;
  dragOver: string | null;
  onCreate: (date: Date) => void;
  onDrop: (dateKey: string, date: Date) => void;
  onDragOver: (dateKey: string) => void;
  onDragLeave: () => void;
  onEdit: (session: ClientPlannedSession) => void;
  onOpenBrick: (sessions: ClientPlannedSession[]) => void;
}) {
  return (
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
        {weeks.flat().map((cell) => (
          <CalendarMonthCell
            key={format(cell.date, 'yyyy-MM-dd')}
            cell={cell}
            dragOver={dragOver}
            eventsByDay={eventsByDay}
            linkedActivityIds={linkedActivityIds}
            onCreate={onCreate}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onEdit={onEdit}
            onOpenBrick={onOpenBrick}
          />
        ))}
      </div>
    </div>
  );
}
