'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ThreadEntryRow } from '@/components/training/thread/thread-entry-row';
import { ThreadTodayCard } from '@/components/training/thread/thread-today-card';
import { TrainingSectionLink } from '@/components/training/hub/training-dashboard-shell';
import { dayKeyFromDate } from '@/lib/date/day-key';
import type { ThreadDay } from '@/lib/training/thread/thread-model';
import { cn } from '@/lib/utils';

/**
 * The thread: the next few sessions, then the last few.
 *
 * A digest rather than the whole archive. Week separators are gone with it —
 * once the past reads backwards and the future forwards, a list carrying both
 * ran S34 → S35 → S34 down the page, with the current week printed twice and the
 * next one wedged between its two halves.
 *
 * What replaces them is a door on each side. Planning holds the whole plan and
 * History the whole archive; this page holds the part that bears on today, and
 * says plainly where the rest is.
 */

function todayDayKey(): string {
  const now = new Date();
  return dayKeyFromDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

function DayGroup({
  day,
  isToday,
  expandedTodayId,
  pivotEntryId,
}: {
  day: ThreadDay;
  isToday: boolean;
  expandedTodayId: string | null;
  pivotEntryId: string | null;
}) {
  return (
    <li aria-current={isToday ? 'date' : undefined}>
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
              {/* One card, not every session of the day: the expanded treatment
                  means "this is the one to do now", and giving it to three of
                  them says nothing. */}
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
}

export function ThreadTimeline({
  upcoming,
  past,
  pivotEntryId = null,
}: {
  /** Today and after, in the order it will happen. */
  upcoming: readonly ThreadDay[];
  /** Before today, most recent first. */
  past: readonly ThreadDay[];
  /** The session the current week turns on — marked, not merely listed. */
  pivotEntryId?: string | null;
}) {
  const today = todayDayKey();

  /* The first session still owed today — the others stay rows. */
  const expandedTodayId =
    upcoming.find((day) => day.dayKey === today)?.entries.find((e) => e.kind === 'planned')?.id ??
    null;

  return (
    <div className="space-y-6">
      <section>
        <TrainingSectionLink cta="Planning" href="/training/planning" title="À venir" />
        {upcoming.length > 0 ? (
          <ol className="space-y-2">
            {upcoming.map((day) => (
              <DayGroup
                key={`up-${day.dayKey}`}
                day={day}
                expandedTodayId={expandedTodayId}
                isToday={day.dayKey === today}
                pivotEntryId={pivotEntryId}
              />
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground px-0.5 text-sm">Aucune séance prévue.</p>
        )}
      </section>

      {past.length > 0 ? (
        <section>
          <TrainingSectionLink cta="Historique" href="/training/history" title="Déjà fait" />
          <ol className="space-y-2">
            {past.map((day) => (
              <DayGroup
                key={`past-${day.dayKey}`}
                day={day}
                expandedTodayId={null}
                isToday={false}
                pivotEntryId={null}
              />
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
