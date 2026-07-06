import type { CalendarDay } from '@/lib/calendar';
import type { ClientPlannedSession } from '@/lib/query/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDayContent } from './calendar-day-content';
import type { DayEvent } from './calendar-types';

export function CalendarWeekList({
  days,
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
  days: CalendarDay[];
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
    <div className="border-border/60 divide-border/60 divide-y overflow-hidden rounded-xl border">
      {days.map((cell) => {
        const dateKey = format(cell.date, 'yyyy-MM-dd');
        const hasItems =
          (eventsByDay[dateKey]?.length ?? 0) > 0 ||
          cell.activities.some((a) => !linkedActivityIds.has(a.id)) ||
          cell.planned.length > 0;

        return (
          <div
            key={dateKey}
            className={cn(
              'cursor-pointer px-3 py-3 transition-colors',
              cell.isToday && 'bg-primary/5',
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
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium capitalize">
                {format(cell.date, 'EEEE d MMM', { locale: fr })}
                {cell.isToday && (
                  <span className="text-primary ml-2 text-xs font-semibold tracking-wide uppercase">
                    Aujourd&apos;hui
                  </span>
                )}
              </p>
              {!hasItems && (
                <span className="text-muted-foreground text-xs">Repos · planifier</span>
              )}
            </div>
            <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
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
      })}
    </div>
  );
}
