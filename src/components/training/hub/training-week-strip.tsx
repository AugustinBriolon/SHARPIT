'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { buildCalendarWeek } from '@/lib/calendar';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import {
  buildWeekCells,
  buildWeekSummary,
  weekCellAccent,
  weekCellHref,
  weekCellReading,
  weekSummaryLabel,
} from '@/lib/training/week-strip';
import { cn } from '@/lib/utils';

const WEEK_CELL_COUNT = 7;

/** Mobile shows the 4 most recent weeks, sm 5, lg all 7 — grid cols must match. */
function cellVisibilityClass(index: number, count: number): string {
  const weeksAgo = count - 1 - index;
  if (weeksAgo >= 5) return 'hidden lg:flex';
  if (weeksAgo >= 4) return 'hidden sm:flex';
  return 'flex';
}

function readingWords(kind: 'done' | 'planned' | 'empty', count: number): string | null {
  if (kind === 'done') return count > 1 ? 'activités' : 'activité';
  if (kind === 'planned') return count > 1 ? 'prévues' : 'prévue';
  return null;
}

/**
 * Bande ink week strip — one cell per week (previous weeks + current, Lime).
 * Each cell shows the realized (green) or planned (neutral) session count and
 * opens the planning framed on that week.
 */
export function TrainingWeekStrip({
  activities,
  className,
  loading = false,
  plannedSessions,
}: {
  activities: ClientActivity[];
  className?: string;
  loading?: boolean;
  plannedSessions: ClientPlannedSession[];
}) {
  const weekCells = useMemo(
    () => buildWeekCells(activities, plannedSessions, new Date(), WEEK_CELL_COUNT),
    [activities, plannedSessions],
  );
  const summaryLabel = useMemo(() => {
    const currentWeekDays = buildCalendarWeek(new Date(), activities, plannedSessions);
    return weekSummaryLabel(buildWeekSummary(currentWeekDays));
  }, [activities, plannedSessions]);

  return (
    <section className={cn('min-w-0', className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3 px-0.5">
        <p className="text-label">Rythme hebdo</p>
        {loading ? (
          <SkeletonDataValue heightClassName="h-3" widthClassName="w-24" />
        ) : summaryLabel ? (
          <span className="text-data text-muted-foreground text-[11px] tracking-wide">
            Cette semaine · {summaryLabel}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 sm:gap-2 lg:grid-cols-7">
        {weekCells.map((cell, index) => {
          const reading = weekCellReading(cell);
          const accent = weekCellAccent(reading.kind);
          const words = readingWords(reading.kind, reading.count);
          const weekLabel = format(cell.weekStart, 'd MMMM', { locale: fr });
          return (
            <Link
              key={format(cell.weekStart, 'yyyy-MM-dd')}
              href={weekCellHref(cell)}
              title={`Ouvrir le planning — semaine du ${weekLabel}`}
              className={cn(
                cellVisibilityClass(index, weekCells.length),
                'flex-col items-center gap-1 rounded-lg px-1 py-2',
                'focus-visible:ring-primary/35 transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
                cell.isCurrent
                  ? 'bg-highlight text-highlight-foreground hover:bg-highlight/90'
                  : 'chip-surface hover:border-primary/35',
              )}
            >
              <span
                className={cn(
                  'text-[9px] tracking-wide whitespace-nowrap uppercase',
                  cell.isCurrent ? 'text-highlight-foreground/70' : 'text-muted-foreground',
                )}
              >
                {cell.isCurrent ? 'Cette sem.' : format(cell.weekStart, 'd MMM', { locale: fr })}
              </span>
              {loading ? (
                <SkeletonDataValue heightClassName="h-4" widthClassName="w-8" />
              ) : reading.kind === 'empty' ? (
                <span className="text-data text-muted-foreground/50 text-xs">—</span>
              ) : (
                <span className="inline-flex items-baseline gap-1">
                  <span
                    className={cn(
                      'text-data text-xs tabular-nums',
                      cell.isCurrent && 'font-semibold',
                    )}
                    style={
                      cell.isCurrent ? undefined : { color: accent ?? 'var(--color-foreground)' }
                    }
                  >
                    {reading.count}
                  </span>
                  <span
                    className={cn(
                      'text-[8.5px]',
                      cell.isCurrent ? 'text-highlight-foreground/70' : 'text-muted-foreground',
                    )}
                  >
                    {words}
                  </span>
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
