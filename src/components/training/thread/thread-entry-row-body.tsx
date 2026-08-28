'use client';

import { Check, ChevronRight } from 'lucide-react';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';
import { cn } from '@/lib/utils';
import {
  ComparisonPill,
  entryMeta,
  SportDot,
} from '@/components/training/thread/thread-entry-row-meta';
import type { DisplayMode } from '@/lib/preferences/display-mode';

export function buildThreadEntryRowShell({
  isPlanned,
  isPivot,
}: {
  isPlanned: boolean;
  isPivot: boolean;
}): string {
  return cn(
    'group flex w-full items-start gap-2.5 rounded-[14px] px-3 py-2.5 text-left transition-colors lg:items-center',
    'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
    isPlanned
      ? 'border-analysis-border/70 hover:border-primary/30 border border-dashed'
      : 'chip-surface-lg hover:border-primary/25',
    isPivot && 'bg-accent/60 border-primary/30',
  );
}

export function ThreadEntryRowBody({
  entry,
  isPivot,
  isPlanned,
  mode,
}: {
  entry: ThreadEntry;
  isPivot: boolean;
  isPlanned: boolean;
  mode: DisplayMode;
}) {
  const meta = entryMeta(entry, mode);

  return (
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
}
