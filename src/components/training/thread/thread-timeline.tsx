'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';
import { THREAD_DRAG_MIME, ThreadEntryRow } from '@/components/training/thread/thread-entry-row';
import { ThreadTodayCard } from '@/components/training/thread/thread-today-card';
import Link from 'next/link';
import { dayKeyFromDate } from '@/lib/date/day-key';
import type { ThreadDay } from '@/lib/training/thread/thread-model';
import { cn } from '@/lib/utils';

/**
 * The thread: one list, read downward, newest first.
 *
 * Two lists running in opposite directions was the mistake — the page had a
 * heading, an ascending block, another heading and a descending block, and the
 * reader had to work out which way each half ran. A single direction needs no
 * explaining: further down is further back, everywhere, always.
 *
 * The "aujourd'hui" rule is a waterline rather than a label. Everything above it
 * is still owed, everything below already happened, and the eye finds the
 * boundary without reading the date beside it.
 *
 * Each door sits at the end of the direction it extends: Planning above, where
 * the future continues past what is shown, Historique below, where the past does.
 */

/** A door at the end of the direction it extends. */
function EdgeLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'text-muted-foreground hover:text-primary inline-flex min-h-11 items-center gap-1 lg:min-h-9',
        'text-data text-xs tracking-wide transition-colors',
        'focus-visible:ring-primary/35 rounded-sm focus-visible:ring-2 focus-visible:outline-hidden',
      )}
    >
      {label}
      <span aria-hidden>→</span>
    </Link>
  );
}

function todayDayKey(): string {
  const now = new Date();
  return dayKeyFromDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

function DayGroup({
  day,
  isToday,
  expandedTodayId,
  pivotEntryId,
  onDropSession,
}: {
  day: ThreadDay;
  isToday: boolean;
  expandedTodayId: string | null;
  pivotEntryId: string | null;
  onDropSession?: (sessionId: string, target: Date) => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <li>
      <div
        className={cn(
          'flex gap-2.5 rounded-[14px] transition-colors',
          /* The whole day is the target, gutter included: aiming at a date is
             easier than aiming between two rows, and it is the day that changes. */
          over && 'bg-accent/60 ring-primary/40 ring-1',
        )}
        onDragEnter={(event) => {
          if (!onDropSession || !event.dataTransfer.types.includes(THREAD_DRAG_MIME)) return;
          setOver(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setOver(false);
        }}
        onDragOver={(event) => {
          if (!onDropSession || !event.dataTransfer.types.includes(THREAD_DRAG_MIME)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(event) => {
          setOver(false);
          const sessionId = event.dataTransfer.getData(THREAD_DRAG_MIME);
          if (!sessionId || !onDropSession) return;
          event.preventDefault();
          onDropSession(sessionId, day.date);
        }}
      >
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
  anchorLabel = null,
  onDropSession,
}: {
  /** Today and after, nearest first — reversed here so the list reads downward. */
  upcoming: readonly ThreadDay[];
  /** Before today, most recent first. */
  past: readonly ThreadDay[];
  /** The session the current week turns on — marked, not merely listed. */
  pivotEntryId?: string | null;
  /** Set while reading a week other than this one; the line stops saying "today". */
  anchorLabel?: string | null;
  onDropSession?: (sessionId: string, target: Date) => void;
}) {
  const today = todayDayKey();

  /* The last session still owed today — nearest the waterline once reversed. */
  const expandedTodayId =
    upcoming.find((day) => day.dayKey === today)?.entries.find((e) => e.kind === 'planned')?.id ??
    null;

  /* Reversed to the day and to the session: one direction means one direction,
     and a day that read forward inside a list reading backward would be the same
     mistake at a smaller scale. */
  const ahead = [...upcoming]
    .reverse()
    .map((day) => ({ ...day, entries: [...day.entries].reverse() }));

  return (
    <div>
      {/* Above the list, because upward is where the plan continues. */}
      <div className="mb-2 flex justify-end px-0.5">
        <EdgeLink href="/training/planning" label="Tout le planning" />
      </div>

      <ol className="space-y-2">
        {ahead.map((day) => (
          <DayGroup
            key={`up-${day.dayKey}`}
            day={day}
            expandedTodayId={expandedTodayId}
            isToday={day.dayKey === today}
            pivotEntryId={pivotEntryId}
          />
        ))}
      </ol>

      {/* The waterline: owed above, done below. Scrubbed into the past there is
          nothing owed, so it names the week being read instead of lying about
          which day this is. */}
      <div className="my-3 flex items-center gap-3" aria-hidden>
        <span
          className={cn(
            'h-0.5 flex-1 rounded-full',
            anchorLabel ? 'bg-muted-foreground/30' : 'bg-primary',
          )}
        />
        <p
          className={cn(
            'text-data shrink-0 text-[11px] font-semibold tracking-wide uppercase',
            anchorLabel ? 'text-muted-foreground' : 'text-primary',
          )}
        >
          {anchorLabel ?? `Aujourd’hui · ${format(new Date(), 'EEE d', { locale: fr })}`}
        </p>
        <span
          className={cn(
            'h-0.5 flex-1 rounded-full',
            anchorLabel ? 'bg-muted-foreground/30' : 'bg-primary',
          )}
        />
      </div>

      {past.length > 0 ? (
        <ol className="space-y-2">
          {past.map((day) => (
            <DayGroup
              key={`past-${day.dayKey}`}
              day={day}
              expandedTodayId={null}
              isToday={false}
              pivotEntryId={null}
              onDropSession={onDropSession}
            />
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground px-0.5 text-sm">Aucune séance enregistrée.</p>
      )}

      {/* Below it, because downward is where the past continues. */}
      <div className="mt-3 flex justify-end px-0.5">
        <EdgeLink href="/training/history" label="Tout l’historique" />
      </div>
    </div>
  );
}
