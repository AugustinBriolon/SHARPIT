'use client';

import { CoachMemoryInkBand } from '@/components/coach-memory/coach-memory-ink-band';
import { Skeleton } from '@/components/ui/skeleton';

const LIST_PULSE_COUNT = 4;

/** Stable coach memory chrome for Suspense fallback — identity only, no focus or fetch. */
export function CoachMemoryShell() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <CoachMemoryInkBand entries={[]} profileContext="" />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-label text-signal-caution mb-1">Daté</p>
            <h2 className="text-section-title">Déplacements & contraintes</h2>
          </div>
        </div>

        <div className="space-y-3 px-1 py-2" aria-busy>
          {Array.from({ length: LIST_PULSE_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}
