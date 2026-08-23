'use client';

import { useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Check, ChevronRight, Feather } from 'lucide-react';
import Link from 'next/link';
import { activityTypeLabels, formatDuration } from '@/lib/format';
import { SPORT_IDENTITY_TEXT } from '@/lib/activity/sport-identity';
import { durationDelta, formatDelta, loadDelta } from '@/lib/training/thread/thread-delta';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import { TWIN_DRILL_DOWN } from '@/lib/today/today-twin-navigation';
import { usePlannedSessionActions } from '@/hooks/use-planned-session-actions';
import { useAppModal } from '@/providers/app-modal-provider';
import { cn } from '@/lib/utils';

/**
 * One session in the thread.
 *
 * The distinction the whole page rests on is fill: solid means it happened,
 * dashed means it is still owed. That is a shape, not a hue, so it survives a dim
 * screen and a colour-blind reader — and it lets the eye sort the list without
 * reading a single word.
 *
 * Metrics are mono and right-aligned on wide screens so that figures stack in a
 * column down the list. Comparing Tuesday's TSS with Thursday's then costs a
 * glance rather than two readings.
 */

export function entryMeta(entry: ThreadEntry): string[] {
  if (entry.activity) {
    return [
      entry.activity.duration ? formatDuration(entry.activity.duration) : null,
      entry.activity.load != null ? `${Math.round(entry.activity.load)} TSS` : null,
      entry.activity.rpe != null ? `RPE ${entry.activity.rpe}` : null,
    ].filter((part): part is string => Boolean(part));
  }
  return [
    entry.planned?.durationMin ? `${entry.planned.durationMin} min` : null,
    entry.planned?.load != null ? `${Math.round(entry.planned.load)} TSS` : null,
  ].filter((part): part is string => Boolean(part));
}

/**
 * Never the performed figure alone when the prescription exists.
 *
 * A finished session shown by itself says only that it happened. Beside what was
 * asked, it says whether the week is being held — which is the question this page
 * was rebuilt to answer.
 */
export function ComparisonPill({ entry }: { entry: ThreadEntry }) {
  if (entry.kind !== 'paired' || !entry.planned) return null;

  const duration = durationDelta(entry.activity?.duration, entry.planned.durationMin);
  const load = loadDelta(entry.activity?.load, entry.planned.load);
  const shown = duration ?? load;
  if (!shown) return null;

  const prescribed = duration
    ? `prévu ${entry.planned.durationMin} min`
    : `prévu ${Math.round(entry.planned.load ?? 0)} TSS`;

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <span className="border-analysis-border/60 text-muted-foreground text-data rounded-full border px-2 py-0.5 text-[11px] tabular-nums">
        {prescribed}
      </span>
      <span
        className={cn(
          'text-data text-[11px] font-medium tabular-nums',
          shown.verdict === 'over' ? 'text-signal-caution' : 'text-primary',
        )}
      >
        {formatDelta(shown, duration ? 'min' : 'TSS')}
      </span>
    </span>
  );
}

export function SportDot({ entry, className }: { entry: ThreadEntry; className?: string }) {
  return (
    <span
      className={cn(
        'size-[7px] shrink-0 rounded-full',
        entry.kind === 'planned' ? 'border-[1.5px] border-current' : 'bg-current',
        SPORT_IDENTITY_TEXT[entry.type],
        className,
      )}
      aria-hidden
    />
  );
}

/**
 * Adjusting a planned session from the row it sits on.
 *
 * Revealed on hover, but present in the tab order at all times — a control that
 * only exists while a mouse is over it does not exist for a keyboard, and these
 * are the two adjustments an athlete makes most often.
 */
function RowActions({ session }: { session: NonNullable<ThreadEntry['planned']> }) {
  const { shift, ease, pending } = usePlannedSessionActions();

  const buttonClass = cn(
    'text-muted-foreground/70 hover:text-foreground hover:bg-accent/60 rounded-full p-1.5',
    'opacity-0 transition-[opacity,color,background-color] group-hover:opacity-100 focus-visible:opacity-100',
    'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
    'disabled:opacity-30 max-lg:opacity-100',
  );

  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <button
        aria-label={`Décaler ${session.title ?? 'la séance'} d’un jour`}
        className={buttonClass}
        disabled={pending}
        type="button"
        onClick={(event) => {
          // The row itself opens the session; these must not do both.
          event.stopPropagation();
          event.preventDefault();
          shift(session);
        }}
      >
        <CalendarPlus className="size-3.5" aria-hidden />
      </button>
      <button
        aria-label={`Alléger ${session.title ?? 'la séance'}`}
        className={buttonClass}
        disabled={pending}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          ease(session);
        }}
      >
        <Feather className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}

export function ThreadEntryRow({
  entry,
  isPivot = false,
}: {
  entry: ThreadEntry;
  isPivot?: boolean;
}) {
  const queryClient = useQueryClient();
  const { openPlannedSession } = useAppModal();

  const isPlanned = entry.kind === 'planned';
  const meta = entryMeta(entry);

  const body = (
    <>
      <SportDot className="mt-1.5 lg:mt-0" entry={entry} />

      <span className="flex min-w-0 flex-1 flex-col gap-1 lg:flex-row lg:items-center lg:gap-3">
        <span className="text-foreground min-w-0 truncate text-[13.5px] font-medium">
          {entry.title}
        </span>

        {isPivot ? (
          <span className="border-primary/40 text-primary text-data w-fit shrink-0 rounded-full border px-2 py-0.5 text-[10px]">
            Point de bascule
          </span>
        ) : null}

        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 lg:ml-auto lg:flex-nowrap lg:justify-end">
          <ComparisonPill entry={entry} />
          {meta.length > 0 ? (
            <span className="text-muted-foreground text-data shrink-0 text-[11px] tabular-nums">
              {meta.join(' · ')}
            </span>
          ) : null}
        </span>
      </span>

      {isPlanned ? (
        <ChevronRight
          className="text-muted-foreground/50 mt-0.5 size-4 shrink-0 lg:mt-0"
          aria-hidden
        />
      ) : (
        <Check className="text-primary mt-0.5 size-4 shrink-0 lg:mt-0" aria-hidden />
      )}
    </>
  );

  const shell = cn(
    'group flex w-full items-start gap-2.5 rounded-[14px] px-3 py-2.5 text-left transition-colors lg:items-center',
    'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
    isPlanned
      ? 'border-analysis-border/70 hover:border-primary/30 border border-dashed'
      : 'chip-surface-lg hover:border-primary/25',
    // The pivot is the session the week turns on — it gets ground, not just a pill.
    isPivot && 'bg-accent/60 border-primary/30',
  );

  if (isPlanned && entry.planned) {
    const session = entry.planned;
    // The row is a <button>; the actions cannot nest inside it, so they sit
    // beside it and the group is what reveals them on hover.
    return (
      <div className="group flex items-center gap-1">
        <button
          aria-label={`${activityTypeLabels[entry.type]} prévue · ${entry.title}`}
          className={cn(shell, 'min-w-0 flex-1')}
          type="button"
          onClick={() => openPlannedSession({ sessionId: session.id })}
          onFocus={() => prefetchPlannedSessionDetail(queryClient, session.id)}
          onPointerEnter={() => prefetchPlannedSessionDetail(queryClient, session.id)}
        >
          {body}
        </button>
        <RowActions session={session} />
      </div>
    );
  }

  if (entry.activity) {
    return (
      <Link className={shell} href={TWIN_DRILL_DOWN.activity(entry.activity.id)}>
        {body}
      </Link>
    );
  }

  return <span className={shell}>{body}</span>;
}
