'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ComparisonPill, SportDot, entryMeta } from '@/components/training/thread/thread-entry-row';
import { coachDiscussHref } from '@/lib/coach/chat/coach-discuss-href';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';
import { ThreadEaseDialog } from '@/components/training/thread/thread-ease-dialog';
import { ThreadShiftDialog } from '@/components/training/thread/thread-shift-dialog';
import { usePlannedSessionActions } from '@/hooks/use-planned-session-actions';
import { useAppModal } from '@/providers/app-modal-provider';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/**
 * Stops a press on an action from also opening the session behind it.
 *
 * The card is clickable everywhere, which is what makes it feel like the object
 * it represents — but "Alléger" must alter the session, not alter it and then
 * navigate away from the result.
 */
function swallow(event: React.MouseEvent) {
  event.stopPropagation();
}

/**
 * Today's session, opened out.
 *
 * Every other row in the thread is one line, which is what makes the list
 * scannable — and what makes this one, given three, read as the thing to do now
 * without needing a colour to say so. Size is the only hierarchy cue that works
 * before the eye has read anything.
 *
 * The actions sit on the card rather than behind a gesture: a swipe is fine as an
 * accelerant on a phone but cannot be the only way in, or the session becomes
 * unreachable by keyboard.
 */
export function ThreadTodayCard({
  entry,
  instruction,
}: {
  entry: ThreadEntry;
  /** The coach's word on this session, when there is one. */
  instruction: string | null;
}) {
  const queryClient = useQueryClient();
  const { openPlannedSession } = useAppModal();
  const { ease, reschedule, pending } = usePlannedSessionActions();
  const [shiftOpen, setShiftOpen] = useState(false);
  const [easeOpen, setEaseOpen] = useState(false);

  const sessionId = entry.planned?.id ?? null;
  const meta = entryMeta(entry);

  const open = () => {
    if (sessionId) openPlannedSession({ sessionId });
  };

  return (
    <>
      <div
        className={cn(
          'group chip-surface-lg rounded-analysis-lg px-4 py-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]',
          sessionId && 'hover:border-primary/25 cursor-pointer transition-colors',
        )}
        /* The whole card opens the session. The arrow stays as the labelled control
          for keyboard and assistive tech — this is a convenience on top of it, not
         a replacement, so the card itself is not a fake button wrapping real ones. */
        onClick={sessionId ? open : undefined}
        onPointerEnter={() => sessionId && prefetchPlannedSessionDetail(queryClient, sessionId)}
      >
        <div className="flex items-start gap-2.5">
          <SportDot className="mt-2" entry={entry} />

          <div className="min-w-0 flex-1">
            <p className="text-verdict text-foreground text-base leading-tight sm:text-[17px]">
              {entry.title}
            </p>
            <p className="text-muted-foreground text-data mt-1.5 text-[11px] tabular-nums">
              {meta.join(' · ')}
            </p>
            <ComparisonPill entry={entry} />
          </div>

          {sessionId ? (
            <button
              aria-label={`Ouvrir ${entry.title}`}
              type="button"
              className={cn(
                'bg-highlight text-highlight-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-full',
                'focus-visible:ring-primary/35 transition-transform focus-visible:ring-2 focus-visible:outline-hidden',
                'group-hover:scale-105',
              )}
              onClick={open}
            >
              <ArrowRight className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>

        {instruction ? (
          <p className="text-foreground/85 mt-3 pl-3 text-[13.5px] leading-relaxed">
            {instruction}
          </p>
        ) : null}

        {sessionId ? (
          <div className="mt-3.5 flex flex-wrap gap-2" onClick={swallow}>
            {entry.planned ? (
              <>
                <ActionPill disabled={pending} label="Décaler" onClick={() => setShiftOpen(true)} />
                <ActionPill disabled={pending} label="Alléger" onClick={() => setEaseOpen(true)} />
              </>
            ) : null}
            <Link
              href={coachDiscussHref({ kind: 'planned-session', sessionId })}
              className={cn(
                'border-analysis-border/70 text-muted-foreground hover:text-foreground hover:border-primary/30',
                'inline-flex min-h-9 items-center rounded-full border px-3 text-xs transition-colors',
                'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
              )}
            >
              Discuter avec le coach
            </Link>
          </div>
        ) : null}
      </div>

      {/* Outside the clickable card on purpose. A React portal still propagates
          events through the React tree, so a press on "Valider" inside the dialog
          reached the card behind it and opened the session as well. */}
      {entry.planned ? (
        <>
          <ThreadShiftDialog
            open={shiftOpen}
            session={entry.planned}
            onConfirm={(day, startTime) => reschedule(entry.planned!, day, startTime)}
            onOpenChange={setShiftOpen}
          />
          <ThreadEaseDialog
            open={easeOpen}
            session={entry.planned}
            onConfirm={() => ease(entry.planned!)}
            onOpenChange={setEaseOpen}
          />
        </>
      ) : null}
    </>
  );
}

function ActionPill({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      type="button"
      className={cn(
        'border-analysis-border/70 text-muted-foreground hover:text-foreground hover:border-primary/30',
        'inline-flex min-h-9 items-center rounded-full border px-3 text-xs transition-colors',
        'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
        'disabled:opacity-50',
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
