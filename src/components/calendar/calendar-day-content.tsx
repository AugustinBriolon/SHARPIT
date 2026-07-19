import { groupPlannedSessions } from '@/lib/brick-sessions';
import type { CalendarDay } from '@/lib/calendar';
import type { ClientPlannedSession } from '@/lib/query/types';
import { ActivityChip, BrickChip, GoogleEventChip, PlannedChip } from './calendar-chips';
import type { DayEvent } from './calendar-types';

export function CalendarDayContent({
  cell,
  dateKey,
  eventsByDay,
  linkedActivityIds,
  onEdit,
  onOpenBrick,
  onPrefetch,
}: {
  cell: CalendarDay;
  dateKey: string;
  eventsByDay: Record<string, DayEvent[]>;
  linkedActivityIds: Set<string>;
  onEdit: (session: ClientPlannedSession) => void;
  onOpenBrick: (sessions: ClientPlannedSession[]) => void;
  onPrefetch?: (session: ClientPlannedSession) => void;
}) {
  return (
    <>
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
            onEdit={() => onEdit(item.session)}
            onPrefetch={() => onPrefetch?.(item.session)}
          />
        ) : (
          <BrickChip
            key={item.id}
            sessions={item.sessions}
            onEdit={onEdit}
            onOpen={() => onOpenBrick(item.sessions)}
          />
        ),
      )}
    </>
  );
}
