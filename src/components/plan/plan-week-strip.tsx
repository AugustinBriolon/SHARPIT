'use client';

import Link from 'next/link';
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
        'size-1.5 shrink-0 rounded-full',
        entry.kind === 'planned' ? 'border border-current' : 'bg-current',
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
 * The week as one instrument. The strip itself opens the week editor.
 */
export function PlanWeekStrip({ days }: { days: readonly PlanWeekDay[] }) {
  return (
    <Link
      aria-label="Voir la semaine"
      className="analysis-panel rounded-analysis-lg focus-visible:ring-ring block overflow-hidden focus-visible:ring-2 focus-visible:outline-none"
      href="/plan/semaine"
    >
      <ol className="divide-analysis-border/70 grid grid-cols-7 divide-x">
        {days.map((day) => (
          <li
            key={day.dayKey}
            aria-current={day.isToday ? 'date' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 px-0.5 py-2.5',
              day.isToday && 'bg-highlight',
            )}
          >
            <span className="sr-only">{dayDescription(day)}</span>
            <span
              className={cn(
                'text-label',
                day.isToday ? 'text-foreground' : 'text-muted-foreground',
              )}
              aria-hidden
            >
              {format(day.date, 'EEEEE', { locale: fr })}
            </span>
            <span
              className={cn(
                'text-data text-sm tabular-nums',
                day.isToday ? 'text-foreground font-semibold' : 'text-foreground/80',
              )}
              aria-hidden
            >
              {format(day.date, 'd')}
            </span>
            <span className="flex h-2.5 items-center justify-center gap-0.5" aria-hidden>
              {day.state === 'rest' ? (
                <span className="bg-analysis-border/80 h-px w-2.5" />
              ) : (
                day.entries.slice(0, 3).map((entry) => <EntryMark key={entry.id} entry={entry} />)
              )}
            </span>
          </li>
        ))}
      </ol>
    </Link>
  );
}
