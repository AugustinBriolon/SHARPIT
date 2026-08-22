'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

export type ThreadReading = {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  /** Shown as a pill before the value — recency, mostly. */
  readonly note?: string | null;
  readonly href: string;
};

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
  if (readings.length === 0) return null;

  return (
    <section className={className}>
      <p className="text-label mb-2">{title}</p>
      <ul className="chip-surface-lg rounded-analysis-lg divide-analysis-border/50 divide-y">
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
