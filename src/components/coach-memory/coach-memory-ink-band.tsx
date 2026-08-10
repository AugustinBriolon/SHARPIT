'use client';

import { Brain } from 'lucide-react';
import type { ReactNode } from 'react';
import { parseDurablePreferences } from '@/lib/coach-memory/memory-summary';
import type { CoachMemoryEntry } from '@/lib/coach-memory/types';
import { cn } from '@/lib/utils';

type BandCounter = { label: string; value: number; accent?: boolean };

/**
 * Page anchor in coach voice — the single ink band.
 * When there is nothing remembered yet, only the identity and counters remain.
 */
export function CoachMemoryInkBand({
  profileContext,
  entries,
  actions,
}: {
  profileContext: string;
  entries: CoachMemoryEntry[];
  /** Add-constraint control — desktop only, the section header carries it on mobile. */
  actions?: ReactNode;
}) {
  const durableCount = parseDurablePreferences(profileContext).length;

  const counters: BandCounter[] = [];
  if (durableCount > 0) {
    counters.push({ label: 'Préférences', value: durableCount, accent: true });
  }
  if (entries.length > 0) {
    counters.push({ label: 'Contraintes datées', value: entries.length });
  }

  return (
    <section className="surface-ink px-5 py-6 sm:px-7 sm:py-7">
      <div className="lg:grid lg:grid-cols-[1.5fr_1fr] lg:items-start lg:gap-8">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="bg-ink-surface-foreground/12 text-ink-accent flex size-11 shrink-0 items-center justify-center rounded-full sm:size-12"
              aria-hidden
            >
              {/* Same mark as the Réglages entry that leads here. */}
              <Brain className="size-5 sm:size-6" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-label text-ink-surface-foreground/60">contexte coach</p>
              <h1 className="text-page-title text-ink-surface-foreground mt-1 leading-snug">
                Mémoire du coach
              </h1>
            </div>
          </div>
        </div>

        <div className="mt-6 lg:mt-0">
          {/* Desktop only — the dated section header carries this action on mobile. */}
          {actions ? <div className="mb-5 hidden justify-end lg:flex">{actions}</div> : null}

          {counters.length > 0 ? (
            <dl
              className={cn(
                'divide-ink-surface-foreground/15 grid divide-x',
                counters.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
              )}
            >
              {counters.map((counter) => (
                <div key={counter.label} className="min-w-0 px-4 first:pl-0 last:pr-0">
                  {/* Value leads, label reads underneath it. */}
                  <dd
                    className={cn(
                      'font-heading text-[1.5rem] leading-none font-semibold tabular-nums',
                      'lg:text-[1.75rem]',
                      counter.accent ? 'text-ink-accent' : 'text-ink-surface-foreground',
                    )}
                  >
                    {counter.value}
                  </dd>
                  <dt className="text-label text-ink-surface-foreground/60 mt-1.5">
                    {counter.label}
                  </dt>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </section>
  );
}
