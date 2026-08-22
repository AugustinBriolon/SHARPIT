'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronRight } from 'lucide-react';
import { activityTypeLabels, formatDuration } from '@/lib/format';
import { SPORT_IDENTITY_TEXT } from '@/lib/activity/sport-identity';
import { durationDelta, formatDelta, loadDelta } from '@/lib/training/thread/thread-delta';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import { TWIN_DRILL_DOWN } from '@/lib/today/today-twin-navigation';
import { useAppModal } from '@/providers/app-modal-provider';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/**
 * One session in the thread.
 *
 * The distinction the whole page rests on is fill: solid means it happened,
 * dashed means it is still owed. That is a shape, not a hue, so it survives a dim
 * screen and a colour-blind reader — and it lets the eye sort the list without
 * reading a single word.
 */

function metaOf(entry: ThreadEntry): string[] {
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
function ComparisonLine({ entry }: { entry: ThreadEntry }) {
  if (entry.kind !== 'paired' || !entry.planned) return null;

  const duration = durationDelta(entry.activity?.duration, entry.planned.durationMin);
  const load = loadDelta(entry.activity?.load, entry.planned.load);
  const shown = duration ?? load;
  if (!shown) return null;

  const prescribed = duration
    ? `prévu ${entry.planned.durationMin} min`
    : `prévu ${Math.round(entry.planned.load ?? 0)} TSS`;

  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
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

export function ThreadEntryRow({ entry }: { entry: ThreadEntry }) {
  const queryClient = useQueryClient();
  const { openPlannedSession } = useAppModal();

  const isPlanned = entry.kind === 'planned';
  const meta = metaOf(entry);

  const body = (
    <>
      <span
        className={cn(
          'mt-1.5 size-[7px] shrink-0 rounded-full',
          isPlanned ? 'border-[1.5px] border-current' : 'bg-current',
          SPORT_IDENTITY_TEXT[entry.type],
        )}
        aria-hidden
      />

      <span className="min-w-0 flex-1">
        <span className="text-foreground block truncate text-[13.5px] font-medium">
          {entry.title}
        </span>
        {meta.length > 0 ? (
          <span className="text-muted-foreground text-data mt-0.5 block text-[11px] tabular-nums">
            {meta.join(' · ')}
          </span>
        ) : null}
        <ComparisonLine entry={entry} />
      </span>

      {isPlanned ? (
        <ChevronRight className="text-muted-foreground/50 mt-0.5 size-4 shrink-0" aria-hidden />
      ) : (
        <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
      )}
    </>
  );

  const shell = cn(
    'flex w-full items-start gap-2.5 rounded-[14px] px-3 py-2.5 text-left transition-colors',
    'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
    isPlanned
      ? 'border-analysis-border/70 hover:border-primary/30 border border-dashed'
      : 'chip-surface-lg hover:border-primary/25',
  );

  if (isPlanned && entry.planned) {
    const sessionId = entry.planned.id;
    return (
      <button
        aria-label={`${activityTypeLabels[entry.type]} prévue · ${entry.title}`}
        className={shell}
        type="button"
        onClick={() => openPlannedSession({ sessionId })}
        onFocus={() => prefetchPlannedSessionDetail(queryClient, sessionId)}
        onPointerEnter={() => prefetchPlannedSessionDetail(queryClient, sessionId)}
      >
        {body}
      </button>
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
