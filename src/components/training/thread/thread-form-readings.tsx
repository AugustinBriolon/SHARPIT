'use client';

import Link from 'next/link';
import { Sparkline } from '@/components/today/dashboard/sparkline';
import { cn } from '@/lib/utils';

export type ThreadReading = {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  /** Shown as a pill before the value — recency, mostly. */
  readonly note?: string | null;
  /**
   * Where the figure has been, when there is a history to draw.
   *
   * A threshold of 4′02/km says nothing on its own: it is only good or bad
   * against where it was a month ago. Omitted rather than flattened when there is
   * no history — a straight line would claim stability that was never measured.
   */
  readonly series?: readonly (number | null)[] | null;
  /** A rise is a loss for a pace, a gain for a power. */
  readonly lowerIsBetter?: boolean;
  readonly href: string;
};

/**
 * Which way the figure has moved, as colour on its own trace.
 *
 * Read from the ends rather than a fit: the athlete cares whether he is better
 * than he was, not what the regression slope is.
 */
function trendClass(reading: ThreadReading): string {
  const points = (reading.series ?? []).filter((value): value is number => value !== null);
  if (points.length < 2) {
    return 'text-muted-foreground';
  }

  const change = points[points.length - 1]! - points[0]!;
  if (change === 0) {
    return 'text-muted-foreground';
  }

  const improved = reading.lowerIsBetter ? change < 0 : change > 0;
  return improved ? 'text-primary' : 'text-signal-caution';
}

/**
 * What the thread says about form: three lines, each one a door.
 *
 * This replaces a grid of progression cards. Three readings that each lead
 * somewhere beat six tiles that each lead nowhere, and a reading with no
 * destination is a number the athlete can do nothing with.
 */
export function ThreadFormReadings({
  readings,
  title = 'Ce que le fil dit de ta forme',
  className,
}: {
  readings: readonly ThreadReading[];
  title?: string;
  className?: string;
}) {
  if (readings.length === 0) {
    return null;
  }

  return (
    <section className={className}>
      <p className="text-label mb-2">{title}</p>
      <ul className="chip-surface-lg rounded-analysis-lg divide-analysis-border/50 divide-y overflow-hidden">
        {readings.map((reading) => (
          <li key={reading.key}>
            <Link
              href={reading.href}
              className={cn(
                'flex min-h-11 items-center gap-3 px-3.5 py-2.5 transition-colors',
                'hover:bg-accent/40 focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
              )}
            >
              <span className="text-foreground min-w-0 flex-1 truncate text-[13.5px]">
                {reading.label}
              </span>

              {reading.series && reading.series.filter((v) => v !== null).length > 1 ? (
                <span className={cn('w-14 shrink-0', trendClass(reading))} aria-hidden>
                  <Sparkline h={18} stroke="currentColor" values={[...reading.series]} />
                </span>
              ) : null}
              {reading.note ? (
                <span className="border-analysis-border/60 text-muted-foreground text-data shrink-0 rounded-full border px-2 py-0.5 text-[10px]">
                  {reading.note}
                </span>
              ) : null}
              <span className="text-data text-foreground shrink-0 text-[13px] tabular-nums">
                {reading.value}
              </span>
              <span className="text-muted-foreground/60 text-data shrink-0 text-xs" aria-hidden>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
