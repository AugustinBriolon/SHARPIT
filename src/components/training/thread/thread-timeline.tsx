'use client';

import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowUp } from 'lucide-react';
import { ThreadEntryRow } from '@/components/training/thread/thread-entry-row';
import { ThreadTodayCard } from '@/components/training/thread/thread-today-card';
import { dayKeyFromDate } from '@/lib/date/day-key';
import type { ThreadWeek } from '@/lib/training/thread/thread-model';
import { cn } from '@/lib/utils';

/**
 * The thread itself: an ordered list of days, past and planned in one flow.
 *
 * A real `<ol>` of `<li>`, because that is what this is — a sequence where order
 * carries meaning. Screen readers get the count and the position for free, and
 * today is marked `aria-current="date"` so jumping to it is one command rather
 * than a scroll hunt.
 */

function todayDayKey(): string {
  const now = new Date();
  return dayKeyFromDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function ThreadTimeline({
  weeks,
  onLoadEarlier,
  earliestLabel,
  earliestLoad,
  earliestCount,
  pivotEntryId = null,
  constraintByWeek,
}: {
  weeks: readonly ThreadWeek[];
  onLoadEarlier: () => void;
  earliestLabel: string | null;
  earliestLoad: number | null;
  earliestCount: number | null;
  /** The session the current week turns on — marked, not merely listed. */
  pivotEntryId?: string | null;
  /** Travel and other commitments, keyed by week, shown where they bite. */
  constraintByWeek?: ReadonlyMap<string, string>;
}) {
  const today = todayDayKey();

  /* The first session still owed today — the others stay rows. */
  const expandedTodayId =
    weeks
      .flatMap((week) => week.days)
      .find((day) => day.dayKey === today)
      ?.entries.find((entry) => entry.kind === 'planned')?.id ?? null;
  const markerRef = useRef<HTMLLIElement>(null);
  const hasScrolled = useRef(false);

  /* Land on today, once. Re-centring on every window change would yank the page
     out from under someone who just asked to see further back. */
  useEffect(() => {
    if (hasScrolled.current || !markerRef.current) return;
    hasScrolled.current = true;
    markerRef.current.scrollIntoView({ block: 'center' });
  }, [weeks]);

  return (
    <div>
      <button
        className="text-muted-foreground hover:text-foreground text-data mb-3 inline-flex items-center gap-1.5 text-xs transition-colors"
        type="button"
        onClick={onLoadEarlier}
      >
        <ArrowUp className="size-3.5" aria-hidden />
        Remonter le fil
        {earliestLabel ? (
          <span className="tabular-nums">
            {' · '}
            {earliestLabel}
            {earliestLoad != null && earliestLoad > 0 ? ` — ${earliestLoad} TSS` : ''}
            {earliestCount != null && earliestCount > 0
              ? ` · ${earliestCount} séance${earliestCount > 1 ? 's' : ''}`
              : ''}
          </span>
        ) : null}
      </button>

      <ol className="space-y-4">
        {weeks.map((week) => (
          <li key={week.weekKey}>
            <div className="mb-2 flex items-baseline gap-3">
              <p className="text-label text-data shrink-0">
                {week.label}
                {week.plannedLoad > 0 ? ` · prévu ${week.plannedLoad} TSS` : ''}
              </p>
              <span className="border-analysis-border/60 h-px flex-1 border-t" aria-hidden />
              {/* A trip is not a section of its own — it is a constraint on the week
                  it falls in, and it belongs where the week is read. */}
              {constraintByWeek?.get(week.weekKey) ? (
                <p className="text-signal-caution text-data shrink-0 text-[11px]">
                  {constraintByWeek.get(week.weekKey)}
                </p>
              ) : null}
            </div>

            <ol className="space-y-2">
              {week.days.map((day) => {
                const isToday = day.dayKey === today;
                return (
                  <li
                    key={day.dayKey}
                    ref={isToday ? markerRef : undefined}
                    aria-current={isToday ? 'date' : undefined}
                  >
                    {isToday ? (
                      <div className="mb-2 flex items-center gap-3">
                        <p className="text-data text-primary shrink-0 text-[11px] font-semibold tracking-wide uppercase">
                          Aujourd’hui · {format(day.date, 'EEE d', { locale: fr })}
                        </p>
                        <span className="bg-primary h-0.5 flex-1 rounded-full" aria-hidden />
                      </div>
                    ) : null}

                    <div className="flex gap-2.5">
                      <p
                        className={cn(
                          'text-data w-11 shrink-0 pt-2.5 text-right text-[11px] leading-none tabular-nums',
                          isToday ? 'text-primary' : 'text-muted-foreground',
                        )}
                      >
                        <span className="block uppercase">
                          {format(day.date, 'EEE', { locale: fr })}
                        </span>
                        <span className="mt-1 block text-sm font-medium">
                          {format(day.date, 'd')}
                        </span>
                      </p>

                      <ol className="min-w-0 flex-1 space-y-2">
                        {day.entries.map((entry) => (
                          <li key={entry.id}>
                            {/* One card, not every session of the day: the expanded
                                treatment means "this is the one to do now", and
                                giving it to three of them says nothing. */}
                            {isToday && entry.id === expandedTodayId ? (
                              <ThreadTodayCard
                                entry={entry}
                                instruction={entry.planned?.description?.trim() || null}
                              />
                            ) : (
                              <ThreadEntryRow entry={entry} isPivot={entry.id === pivotEntryId} />
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}
