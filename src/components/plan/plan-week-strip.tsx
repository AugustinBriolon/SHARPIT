'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SPORT_IDENTITY_TEXT } from '@/lib/activity/sport-identity';
import type { PlanWeekDay } from '@/lib/plan/plan-week';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';
import { cn } from '@/lib/utils';

/** Recorded reads as a filled mark, prescribed as an outline. Never the reverse. */
function EntryMark({ entry }: { entry: ThreadEntry }) {
  return (
    <span
      className={cn(
        'size-[7px] shrink-0 rounded-full',
        entry.kind === 'planned' ? 'border-[1.5px] border-current' : 'bg-current',
        SPORT_IDENTITY_TEXT[entry.type],
      )}
      aria-hidden
    />
  );
}

function dayDescription(day: PlanWeekDay): string {
  const date = format(day.date, 'EEEE d MMMM', { locale: fr });
  const done = day.entries.filter((entry) => entry.kind !== 'planned').length;
  const planned = day.entries.filter((entry) => entry.kind === 'planned').length;

  const parts = [
    done > 0 ? `${done} réalisée${done > 1 ? 's' : ''}` : null,
    planned > 0 ? `${planned} prévue${planned > 1 ? 's' : ''}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? `${date} : ${parts.join(', ')}` : `${date} : repos`;
}

/**
 * The week at a glance, one cell per calendar day.
 *
 * Rest days keep their cell rather than being dropped: a week is read by its
 * shape, and a plan with three empty days says something a compacted list of
 * four sessions cannot.
 */
export function PlanWeekStrip({ days }: { days: readonly PlanWeekDay[] }) {
  return (
    <ol className="grid grid-cols-7 gap-1.5">
      {days.map((day) => (
        <li
          key={day.dayKey}
          aria-current={day.isToday ? 'date' : undefined}
          className={cn(
            'rounded-analysis-sm border px-1 py-2 text-center',
            day.isToday
              ? 'border-primary/40 bg-analysis-surface'
              : 'border-analysis-border/60 bg-analysis-surface-alt/40',
          )}
        >
          <span className="sr-only">{dayDescription(day)}</span>
          <span
            className={cn(
              'text-data block text-[10px] tracking-wide uppercase',
              day.isToday ? 'text-foreground font-semibold' : 'text-muted-foreground',
            )}
            aria-hidden
          >
            {format(day.date, 'EEEEE', { locale: fr })}
          </span>
          <span
            className={cn(
              'text-data block text-[11px] tabular-nums',
              day.isToday ? 'text-foreground font-semibold' : 'text-muted-foreground/70',
            )}
            aria-hidden
          >
            {format(day.date, 'd')}
          </span>
          <span className="mt-1.5 flex h-3 items-center justify-center gap-0.5" aria-hidden>
            {day.state === 'rest' ? (
              <span className="bg-analysis-border h-px w-2.5" />
            ) : (
              day.entries.slice(0, 3).map((entry) => <EntryMark key={entry.id} entry={entry} />)
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
