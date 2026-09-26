'use client';

import Link from 'next/link';
import { Check, Route } from 'lucide-react';
import { cn } from '@sharpit/server/lib/utils';
import type { PlanVivantProgress } from '@sharpit/server/lib/today/rich/plan-vivant-reading';

/**
 * Plan vivant on Résumé — a band that reads as a sentence, with one visual.
 *
 * The visual is the progress toward the goal, which for a race is not a
 * percentage but periodisation: the block you are in, out of those the plan
 * lays down. A metric goal keeps its own number.
 *
 * Two groups, never four flat children: with the bar and the action pinned at
 * their intrinsic width, a single flex row crushed the sentence to one word per
 * line on a phone. Below `sm` the band stacks — sentence across the full width,
 * then bar and action on their own line.
 */

const BAND_CLASS = cn(
  'chip-surface-lg group flex w-full min-w-0 flex-col gap-2',
  'rounded-xl px-3.5 py-2.5 transition-[border-color,background-color] duration-150 ease-out',
  'hover:border-primary/35 focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
  'sm:flex-row sm:items-center sm:gap-3',
);

export type PlanVivantBandTone = 'neutral' | 'tension' | 'done';

function BandIcon({ tone }: { tone: PlanVivantBandTone }) {
  return (
    <span className="icon-well size-6 shrink-0" aria-hidden>
      {tone === 'done' ? (
        <Check className="size-3" strokeWidth={2.5} />
      ) : (
        <Route className="size-3" strokeWidth={2.25} />
      )}
    </span>
  );
}

/** Segments for a race block, a single fill for a percentage. */
function BandProgress({ progress }: { progress: PlanVivantProgress }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className="flex items-center gap-0.5" aria-hidden>
        {progress.percent !== null ? (
          <span className="bg-muted-foreground/20 block h-1 w-16 overflow-hidden rounded-full">
            <span
              className="bg-primary block h-full rounded-full"
              style={{ width: `${progress.percent}%` }}
            />
          </span>
        ) : (
          Array.from({ length: progress.total }, (_, index) => (
            <span
              key={index}
              className={cn(
                'block h-1 w-4 rounded-full',
                index < progress.filled ? 'bg-primary' : 'bg-muted-foreground/20',
              )}
            />
          ))
        )}
      </span>
      {progress.label ? (
        <span className="text-muted-foreground shrink-0 text-[11px]">{progress.label}</span>
      ) : null}
    </span>
  );
}

/** Identity and sentence — takes the whole width on a phone. */
function BandSentence({
  reading,
  note,
  tone,
}: {
  reading: string | null;
  note: string | null;
  tone: PlanVivantBandTone;
}) {
  return (
    <span className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
      <BandIcon tone={tone} />
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-foreground text-[13px] font-semibold tracking-tight">
          Plan vivant
        </span>
        {reading ? (
          <span className="text-muted-foreground min-w-0 text-[12px] text-pretty">{reading}</span>
        ) : null}
        {note ? (
          <span
            className={cn(
              'min-w-0 text-[12px] text-pretty sm:truncate',
              tone === 'tension' ? 'text-signal-caution' : 'text-muted-foreground',
            )}
          >
            {note}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function BandContent({
  reading,
  note,
  progress,
  actionLabel,
  tone,
}: {
  reading: string | null;
  note: string | null;
  progress: PlanVivantProgress | null;
  actionLabel: string;
  tone: PlanVivantBandTone;
}) {
  return (
    <>
      <BandSentence note={note} reading={reading} tone={tone} />

      <span className="flex shrink-0 items-center justify-between gap-3 ps-8 sm:justify-end sm:ps-0">
        {progress ? <BandProgress progress={progress} /> : <span aria-hidden />}
        <span className="text-primary inline-flex shrink-0 items-center gap-1 text-[12px] font-medium">
          {actionLabel}
          <span aria-hidden>→</span>
        </span>
      </span>
    </>
  );
}

export type PlanVivantBandProps = {
  /** Plain French: « Half IronMan Versailles dans 27 jours — 1 faite sur 3 ». */
  reading: string | null;
  /** Why the Twin is asking for something. */
  note?: string | null;
  /** Progress toward the goal — periodisation blocks, or a percentage. */
  progress?: PlanVivantProgress | null;
  actionLabel: string;
  /** Navigates as a whole when given; otherwise the band is a button. */
  href?: string | null;
  onAction?: () => void;
  tone?: PlanVivantBandTone;
  ariaLabel?: string;
  className?: string;
};

export function PlanVivantBand({
  reading,
  note = null,
  progress = null,
  actionLabel,
  href,
  onAction,
  tone = 'neutral',
  ariaLabel,
  className,
}: PlanVivantBandProps) {
  const content = (
    <BandContent
      actionLabel={actionLabel}
      note={note}
      progress={progress}
      reading={reading}
      tone={tone}
    />
  );

  if (href) {
    return (
      <Link
        className={cn(BAND_CLASS, 'active:scale-[0.995]', className)}
        href={href}
        title={ariaLabel ?? `${actionLabel} — Plan vivant`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      aria-label={ariaLabel ?? `${actionLabel} — Plan vivant`}
      className={cn(BAND_CLASS, 'text-left active:scale-[0.995]', className)}
      type="button"
      onClick={onAction}
    >
      {content}
    </button>
  );
}
