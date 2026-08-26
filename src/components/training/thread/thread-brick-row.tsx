'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, ChevronRight, Layers } from 'lucide-react';
import { activityTypeLabels } from '@/lib/format';
import { formatPlannedDuration } from '@/lib/planned-session/sessions';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import { useAppModal } from '@/providers/app-modal-provider';
import { cn } from '@/lib/utils';
import { SportDot } from '@/components/training/thread/thread-entry-row';

/**
 * One brick, one row.
 *
 * A brick is a single prescription split across sports — showing its legs as two
 * unrelated thread rows said nothing about the enchaînement that is the point of
 * planning it as a brick. This renders the legs as one object; opening it lands on
 * the first leg, whose dialog already carries the brick banner and the shared
 * transition analysis.
 */
export function ThreadBrickRow({
  entries,
  isPivot = false,
  expanded = false,
}: {
  entries: ThreadEntry[];
  isPivot?: boolean;
  expanded?: boolean;
}) {
  const queryClient = useQueryClient();
  const { openPlannedSession } = useAppModal();

  const legs = entries.map((e) => e.planned).filter((p): p is NonNullable<typeof p> => p != null);
  const allDone = entries.length > 0 && entries.every((e) => e.kind !== 'planned');
  const totalMin = legs.reduce((sum, l) => sum + (l.durationMin ?? 0), 0);
  const openLeg = legs[0] ?? null;
  const sequence = legs.map((l) => activityTypeLabels[l.type]).join(' → ');
  const title = `Brick · ${sequence}`;

  function open() {
    if (openLeg) openPlannedSession({ sessionId: openLeg.id });
  }

  function prefetch() {
    if (openLeg) prefetchPlannedSessionDetail(queryClient, openLeg.id);
  }

  if (expanded) {
    return (
      <button
        aria-label={`Ouvrir ${title}`}
        className="chip-surface-lg rounded-analysis-lg hover:border-primary/25 relative w-full px-4 py-4 text-left transition-colors"
        type="button"
        onClick={open}
        onFocus={prefetch}
        onPointerEnter={prefetch}
      >
        <div className="flex items-start gap-2.5">
          <Layers className="text-primary mt-1.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-verdict text-foreground text-base leading-tight sm:text-[17px]">
              {title}
            </p>
            {totalMin > 0 ? (
              <p className="text-muted-foreground text-data mt-1.5 text-[11px] tabular-nums">
                {formatPlannedDuration(totalMin)}
              </p>
            ) : null}
          </div>
          <span
            aria-hidden
            className="bg-highlight text-highlight-foreground pointer-events-none inline-flex size-9 shrink-0 items-center justify-center rounded-full"
          >
            <ArrowRight className="size-4" />
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      aria-label={`Brique prévue · ${title}`}
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-[14px] border px-3 py-2.5 text-left transition-colors',
        'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
        allDone
          ? 'chip-surface-lg hover:border-primary/25'
          : 'border-primary/30 bg-primary/5 hover:border-primary/40',
        isPivot && 'bg-accent/60 border-primary/30',
      )}
      type="button"
      onClick={open}
      onFocus={prefetch}
      onPointerEnter={prefetch}
    >
      <Layers className="text-primary size-3.5 shrink-0" aria-hidden />
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="text-foreground min-w-0 truncate text-[13.5px] font-medium">{title}</span>
        {isPivot ? (
          <span className="border-primary/40 text-primary text-data w-fit shrink-0 rounded-full border px-2 py-0.5 text-[10px]">
            Point de bascule
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {entries.map((e) => (
          <SportDot key={e.id} entry={e} />
        ))}
      </span>
      {totalMin > 0 ? (
        <span className="text-muted-foreground text-data shrink-0 text-[11px] tabular-nums">
          {formatPlannedDuration(totalMin)}
        </span>
      ) : null}
      {allDone ? (
        <Check className="text-primary size-4 shrink-0" aria-hidden />
      ) : (
        <ChevronRight className="text-muted-foreground/50 size-4 shrink-0" aria-hidden />
      )}
    </button>
  );
}
