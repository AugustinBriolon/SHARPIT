import { memo } from 'react';
import { weekDayLabels, type CalendarDay } from '@/lib/calendar';
import type { ClientPlannedSession } from '@/lib/query/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarDayContent } from './calendar-day-content';
import type { DayEvent } from './calendar-types';
import {
  getCalendarDayBorderAccent,
  getCalendarDayLoad,
  getDayCellDateClassName,
} from './calendar-utils';

const CalendarMonthCell = memo(function CalendarMonthCell({
  cell,
  dateKey,
  eventsByDay,
  linkedActivityIds,
  isDragOver,
  onCreate,
  onDrop,
  onDragOver,
  onDragLeave,
  onEdit,
  onOpenBrick,
}: {
  cell: CalendarDay;
  dateKey: string;
  eventsByDay: Record<string, DayEvent[]>;
  linkedActivityIds: Set<string>;
  isDragOver: boolean;
  onCreate: (date: Date) => void;
  onDrop: (dateKey: string, date: Date) => void;
  onDragOver: (dateKey: string) => void;
  onDragLeave: () => void;
  onEdit: (session: ClientPlannedSession) => void;
  onOpenBrick: (sessions: ClientPlannedSession[]) => void;
}) {
  const dayLoad = getCalendarDayLoad(cell);
  const borderAccent = getCalendarDayBorderAccent(cell);
  const cellClassName = cn(
    'border-analysis-border/70 focus-visible:ring-primary/30 min-h-28 cursor-pointer border-r border-b p-1.5 transition-colors last:border-r-0 focus-visible:ring-2 focus-visible:outline-hidden',
    !cell.inMonth && 'bg-muted/20',
    isDragOver && 'bg-primary/10',
  );

  return (
    <div
      className={cellClassName}
      role="button"
      style={borderAccent ? { boxShadow: `inset 3px 0 0 ${borderAccent}` } : undefined}
      tabIndex={0}
      onClick={() => onCreate(cell.date)}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(dateKey, cell.date)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(dateKey);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCreate(cell.date);
        }
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-2 px-1">
        <span
          className={cn(
            'text-data min-h-6 text-xs',
            getDayCellDateClassName(cell.isToday, cell.inMonth),
          )}
        >
          {cell.date.getDate()}
        </span>
        <span className="text-data text-muted-foreground shrink-0 text-[10px]">
          {dayLoad != null ? `${dayLoad}` : '—'}
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
});

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
    <div className="analysis-panel rounded-analysis-lg overflow-hidden">
      <div className="border-analysis-border bg-analysis-surface-alt/70 grid grid-cols-7 border-b">
        {weekDayLabels.map((d) => (
          <div key={d} className="text-label px-3 py-2 text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {weeks.flat().map((cell) => {
          const dateKey = format(cell.date, 'yyyy-MM-dd');
          return (
            <CalendarMonthCell
              key={dateKey}
              cell={cell}
              dateKey={dateKey}
              eventsByDay={eventsByDay}
              isDragOver={dragOver === dateKey}
              linkedActivityIds={linkedActivityIds}
              onCreate={onCreate}
              onDragLeave={onDragLeave}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onEdit={onEdit}
              onOpenBrick={onOpenBrick}
            />
          );
        })}
      </div>
    </div>
  );
}
