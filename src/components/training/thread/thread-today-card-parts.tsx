'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';
import { coachDiscussHref } from '@/lib/coach/chat/coach-discuss-href';
import { ComparisonPill, SportDot } from '@/components/training/thread/thread-entry-row-meta';
import { cn } from '@/lib/utils';

export function ThreadTodayCardHeader({
  entry,
  meta,
  sessionId,
}: {
  entry: ThreadEntry;
  meta: string[];
  sessionId: string | null;
}) {
  return (
    <div className="pointer-events-none relative z-[1] flex items-start gap-2.5">
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
        <span
          className="bg-highlight text-highlight-foreground pointer-events-none inline-flex size-9 shrink-0 items-center justify-center rounded-full"
          aria-hidden
        >
          <ArrowRight className="size-4" />
        </span>
      ) : null}
    </div>
  );
}

export function ThreadTodayCardActions({
  sessionId,
  planned: _planned,
  pending,
  onShift,
  onEase,
}: {
  sessionId: string;
  planned: NonNullable<ThreadEntry['planned']>;
  pending: boolean;
  onShift: () => void;
  onEase: () => void;
}) {
  return (
    <div
      className="relative z-10 mt-3.5 flex flex-wrap gap-2"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionPill disabled={pending} label="Décaler" onClick={onShift} />
      <ActionPill disabled={pending} label="Alléger" onClick={onEase} />
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
