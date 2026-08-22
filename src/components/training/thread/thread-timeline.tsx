'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowDown } from 'lucide-react';
import { ThreadEntryRow } from '@/components/training/thread/thread-entry-row';
import { ThreadTodayCard } from '@/components/training/thread/thread-today-card';
import { dayKeyFromDate } from '@/lib/date/day-key';
import type { ThreadWeek } from '@/lib/training/thread/thread-model';
import { cn } from '@/lib/utils';

/**
 * The thread: what is coming, then what has been done.
 *
 * A real `<ol>` of `<li>`, because order carries meaning here — screen readers
 * get the count and the position for free, and today is `aria-current="date"`.
 *
 * The two halves read in opposite directions and that is the point. Forward from
 * today, the next session matters most and the horizon least. Backward from
 * today, yesterday explains how the legs feel and a session from last month
 * explains nothing. Both halves therefore put what matters nearest the top, and
 * the page no longer has to scroll itself on load to find the present.
 */

function todayDayKey(): string {
  const now = new Date();
  return dayKeyFromDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

function WeekHeading({ week, constraint }: { week: ThreadWeek; constraint: string | undefined }) {
  return (
    <div className="mb-2 flex items-baseline gap-3">
      <p className="text-label text-data shrink-0">
        {week.label}
        {week.plannedLoad > 0 ? ` · prévu ${week.plannedLoad} TSS` : ''}
      </p>
      <span className="border-analysis-border/60 h-px flex-1 border-t" aria-hidden />
      {/* A trip is not a section of its own — it is a constraint on the week it
          falls in, and it belongs where that week is read. */}
      {constraint ? (
        <p className="text-signal-caution text-data shrink-0 text-[11px]">{constraint}</p>
      ) : null}
    </div>
  );
}

function DayRow({
  week,
  today,
  expandedTodayId,
  pivotEntryId,
}: {
  week: ThreadWeek;
  today: string;
  expandedTodayId: string | null;
  pivotEntryId: string | null;
}) {
  return (
    <ol className="space-y-2">
      {week.days.map((day) => {
        const isToday = day.dayKey === today;
        return (
          <li key={day.dayKey} aria-current={isToday ? 'date' : undefined}>
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
                  'text-data w-11 shrink-0 pt-2.5 text-right text-[11px] leading-none tabular-nums lg:w-[60px]',
                  isToday ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span className="block uppercase lg:inline">
                  {format(day.date, 'EEE', { locale: fr })}
                </span>
                <span className="mt-1 block text-sm font-medium lg:mt-0 lg:ml-1 lg:inline">
                  {format(day.date, 'd')}
                </span>
              </p>

              <ol className="min-w-0 flex-1 space-y-2">
                {day.entries.map((entry) => (
                  <li key={entry.id}>
                    {/* One card, not every session of the day: the expanded
                        treatment means "this is the one to do now", and giving it
                        to three of them says nothing. */}
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
  );
}

export function ThreadTimeline({
  upcoming,
  past,
  onLoadEarlier,
  daysLoaded,
  pivotEntryId = null,
  constraintByWeek,
}: {
  /** Today and after, in the order it will happen. */
  upcoming: readonly ThreadWeek[];
  /** Before today, most recent first. */
  past: readonly ThreadWeek[];
  onLoadEarlier: () => void;
  daysLoaded: number;
  /** The session the current week turns on — marked, not merely listed. */
  pivotEntryId?: string | null;
  /** Travel and other commitments, keyed by week, shown where they bite. */
  constraintByWeek?: ReadonlyMap<string, string>;
}) {
  const today = todayDayKey();

  /* The first session still owed today — the others stay rows. */
  const expandedTodayId =
    upcoming
      .flatMap((week) => week.days)
      .find((day) => day.dayKey === today)
      ?.entries.find((entry) => entry.kind === 'planned')?.id ?? null;

  return (
    <div className="space-y-6">
      {upcoming.length > 0 ? (
        <ol className="space-y-4">
          {upcoming.map((week) => (
            <li key={`up-${week.weekKey}`}>
              <WeekHeading constraint={constraintByWeek?.get(week.weekKey)} week={week} />
              <DayRow
                expandedTodayId={expandedTodayId}
                pivotEntryId={pivotEntryId}
                today={today}
                week={week}
              />
            </li>
          ))}
        </ol>
      ) : null}

      {past.length > 0 ? (
        <section>
          <div className="mb-3 flex items-baseline gap-3">
            <p className="text-label shrink-0">Déjà fait</p>
            <span className="border-analysis-border/60 h-px flex-1 border-t" aria-hidden />
            <p className="text-data text-muted-foreground shrink-0 text-[11px] tabular-nums">
              {daysLoaded} derniers jours
            </p>
          </div>

          <ol className="space-y-4">
            {past.map((week) => (
              <li key={`past-${week.weekKey}`}>
                <WeekHeading constraint={constraintByWeek?.get(week.weekKey)} week={week} />
                <DayRow expandedTodayId={null} pivotEntryId={null} today={today} week={week} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* At the foot, pointing down: the past now runs downward, so a control
          labelled "remonter" would have pointed the wrong way. */}
      <button
        className="text-muted-foreground hover:text-foreground text-data inline-flex items-center gap-1.5 text-xs transition-colors"
        type="button"
        onClick={onLoadEarlier}
      >
        <ArrowDown className="size-3.5" aria-hidden />
        Charger 7 jours de plus
      </button>
    </div>
  );
}
