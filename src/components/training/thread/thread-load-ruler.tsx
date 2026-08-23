'use client';

import type { RulerBar } from '@/lib/training/thread/load-ruler';
import { rulerRangeLabel } from '@/lib/training/thread/load-ruler';
import { cn } from '@/lib/utils';

const STATE_READING: Record<RulerBar['state'], string> = {
  past: 'réalisé',
  current: 'semaine en cours',
  future: 'prévu',
};

function barReading(bar: RulerBar): string {
  if (bar.unmeasured) return 'séances faites, charge non mesurée';
  return `${bar.load} TSS · ${STATE_READING[bar.state]}`;
}

/**
 * Nine weeks of load, as a shape.
 *
 * Solid is what happened, dashed outline is what is planned — the same grammar
 * the thread uses for sessions, so one glance transfers. Deliberately not a
 * chart: there is no axis, no gridline and no tooltip, because the question it
 * answers is "is the block building or falling away", not "how many TSS in S34".
 */
export function ThreadLoadRuler({
  bars,
  className,
}: {
  bars: readonly RulerBar[];
  className?: string;
}) {
  if (bars.length === 0) return null;

  const range = rulerRangeLabel(bars);

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-label">Réglette de charge</p>
        {range ? <p className="text-data text-muted-foreground text-xs">{range}</p> : null}
      </div>

      <div className="chip-surface-lg rounded-analysis-lg px-3 py-3">
        <div className="flex h-16 items-end gap-1.5" aria-hidden>
          {bars.map((bar) => (
            <div
              key={bar.weekKey}
              style={{ height: `${Math.max(6, bar.height * 100)}%` }}
              className={cn(
                'flex-1 rounded-[3px]',
                bar.state === 'future'
                  ? 'border-analysis-border border border-dashed'
                  : 'bg-muted-foreground/30',
                bar.state === 'current' && 'bg-primary ring-primary/30 ring-1',
              )}
            />
          ))}
        </div>

        <div className="text-data text-muted-foreground mt-2 flex gap-1.5 text-[10px]">
          {bars.map((bar, index) => (
            <span
              key={bar.weekKey}
              className={cn(
                'flex-1 text-center',
                bar.state === 'current' && 'text-foreground font-semibold',
              )}
            >
              {index % 2 === 0 || bar.state === 'current' ? bar.label : ''}
            </span>
          ))}
        </div>
      </div>

      {/* Spelled out once, because fill-versus-outline is the page's whole grammar. */}
      <p className="text-muted-foreground mt-1.5 text-[11px]">
        Plein = réalisé, pointillé = prévu.
      </p>

      <ul className="sr-only">
        {bars.map((bar) => (
          <li key={bar.weekKey}>
            {bar.label} · {barReading(bar)}
          </li>
        ))}
      </ul>
    </div>
  );
}
