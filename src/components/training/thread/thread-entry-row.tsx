'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CalendarPlus, Feather } from 'lucide-react';
import Link from 'next/link';
import { activityTypeLabels } from '@/lib/format';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import { TWIN_DRILL_DOWN } from '@/lib/today/today-twin-navigation';
import { ThreadEaseDialog } from '@/components/training/thread/thread-ease-dialog';
import { ThreadShiftDialog } from '@/components/training/thread/thread-shift-dialog';
import { usePlannedSessionActions } from '@/hooks/use-planned-session-actions';
import { useSwipeReveal } from '@/hooks/use-swipe-reveal';
import { useAppModal } from '@/providers/app-modal-provider';
import { useDisplayMode } from '@/providers/display-mode-provider';
import { cn } from '@/lib/utils';

import {
  buildThreadEntryRowShell,
  ThreadEntryRowBody,
} from '@/components/training/thread/thread-entry-row-body';

export {
  ComparisonPill,
  entryMeta,
  SportDot,
} from '@/components/training/thread/thread-entry-row-meta';

/**
 * Adjusting a planned session from the row it sits on.
 *
 * Revealed on hover, but present in the tab order at all times — a control that
 * only exists while a mouse is over it does not exist for a keyboard, and these
 * are the two adjustments an athlete makes most often.
 */
function RowActions({
  session,
  onDone,
}: {
  session: NonNullable<ThreadEntry['planned']>;
  onDone?: () => void;
}) {
  const { ease, reschedule, pending } = usePlannedSessionActions();
  const [shiftOpen, setShiftOpen] = useState(false);
  const [easeOpen, setEaseOpen] = useState(false);

  const buttonClass = cn(
    'text-muted-foreground/70 hover:text-foreground rounded-analysis px-3',
    'inline-flex items-center gap-1.5 text-[11px] whitespace-nowrap',
    'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
    'disabled:opacity-30',
    // Only the desktop hides them until hover; on a phone the swipe is what hides them.
    'lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100 lg:focus-visible:opacity-100',
  );

  return (
    <span className="flex w-full shrink-0 items-stretch justify-end gap-1 lg:w-auto">
      <button
        aria-label={`Décaler ${session.title ?? 'la séance'} d’un jour`}
        className={buttonClass}
        disabled={pending}
        type="button"
        onClick={(event) => {
          // The row itself opens the session; these must not do both.
          event.stopPropagation();
          event.preventDefault();
          setShiftOpen(true);
          onDone?.();
        }}
      >
        <CalendarPlus className="size-3.5" aria-hidden />
        <span className="lg:hidden">Décaler</span>
      </button>
      <button
        aria-label={`Alléger ${session.title ?? 'la séance'}`}
        className={buttonClass}
        disabled={pending}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          setEaseOpen(true);
          onDone?.();
        }}
      >
        <Feather className="size-3.5" aria-hidden />
        <span className="lg:hidden">Alléger</span>
      </button>

      {/* Same labels, same dialogs as the day's card. A word that means "move it
          one day" on one row and "choose when" three rows up is worse than
          either. */}
      <ThreadShiftDialog
        open={shiftOpen}
        session={session}
        onConfirm={(day, startTime) => reschedule(session, day, startTime)}
        onOpenChange={setShiftOpen}
      />
      <ThreadEaseDialog
        open={easeOpen}
        session={session}
        onConfirm={() => ease(session)}
        onOpenChange={setEaseOpen}
      />
    </span>
  );
}

/**
 * Width of the panel the swipe uncovers.
 *
 * Fixed, and the panel is pinned to it — computing one from the other at runtime
 * would let the row stop half over a button, and a swipe that leaves a control
 * partly covered reads as broken rather than as open.
 */
const SWIPE_PANEL_PX = 168;

/**
 * A planned row: tap to open, hover to adjust on a desktop, swipe to adjust on a
 * phone.
 *
 * The row is a `<button>`, so the actions cannot nest inside it — they sit behind
 * it in the stack and the row slides off them. Both paths reach the same two
 * calls, and both leave the buttons in the tab order, because a control that only
 * exists after a gesture does not exist for a keyboard.
 */
function PlannedRow({
  session,
  shell,
  label,
  children,
  onOpen,
  onPrefetch,
}: {
  session: NonNullable<ThreadEntry['planned']>;
  shell: string;
  label: string;
  children: React.ReactNode;
  onOpen: () => void;
  onPrefetch: () => void;
}) {
  const swipe = useSwipeReveal(SWIPE_PANEL_PX);

  return (
    /* Clipped: the row slides the full width of the panel, and without this it
       travels past the page gutter and over whatever sits to its left. */
    <div className="group rounded-analysis relative overflow-hidden">
      {/* Behind the row, uncovered as it slides. On a desktop this same panel is
          what hover reveals, sitting flush to the right instead. */}
      <div
        className="absolute inset-y-0 right-0 flex items-stretch justify-end lg:w-auto"
        style={{ width: SWIPE_PANEL_PX }}
      >
        <RowActions session={session} onDone={swipe.close} />
      </div>

      <div
        style={{ transform: `translateX(${swipe.offset}px)` }}
        className={cn(
          'bg-background relative',
          swipe.dragging ? '' : 'transition-transform duration-200 ease-out',
          'motion-reduce:transition-none',
        )}
        {...swipe.handlers}
      >
        <button
          aria-label={label}
          className={cn(shell, 'w-full touch-pan-y')}
          type="button"
          onFocus={onPrefetch}
          onPointerEnter={onPrefetch}
          onClick={(event) => {
            if (swipe.swallowClick(event)) {
              return;
            }
            onOpen();
          }}
        >
          {children}
        </button>
      </div>
    </div>
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
  const { mode } = useDisplayMode();

  const isPlanned = entry.kind === 'planned';
  const shell = buildThreadEntryRowShell({ isPlanned, isPivot });
  const body = (
    <ThreadEntryRowBody entry={entry} isPivot={isPivot} isPlanned={isPlanned} mode={mode} />
  );

  if (isPlanned && entry.planned) {
    const session = entry.planned;
    return (
      <PlannedRow
        label={`${activityTypeLabels[entry.type]} prévue · ${entry.title}`}
        session={session}
        shell={shell}
        onOpen={() => openPlannedSession({ sessionId: session.id })}
        onPrefetch={() => prefetchPlannedSessionDetail(queryClient, session.id)}
      >
        {body}
      </PlannedRow>
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
