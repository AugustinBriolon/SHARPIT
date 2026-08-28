'use client';

import type { RulerBar } from '@/lib/training/thread/load-ruler';
import { rulerRangeLabel } from '@/lib/training/thread/load-ruler';
import { formatTrainingLoad } from '@/lib/preferences/display-mode';
import { useThreadScrubber } from '@/hooks/use-thread-scrubber';
import { useDisplayMode } from '@/providers/display-mode-provider';
import { cn } from '@/lib/utils';

const STATE_READING: Record<RulerBar['state'], string> = {
  past: 'réalisé',
  current: 'semaine en cours',
  future: 'prévu',
};

function barReading(bar: RulerBar, mode: 'essential' | 'expert'): string {
  if (bar.unmeasured) {
    return 'séances faites, charge non mesurée';
  }
  return `${formatTrainingLoad(bar.load, mode)} · ${STATE_READING[bar.state]}`;
}

/**
 * Nine weeks of load, as a shape.
 *
 * Solid is what happened, dashed outline is what is planned — the same grammar
 * the thread uses for sessions, so one glance transfers. Deliberately not a
 * chart: there is no axis, no gridline and no tooltip, because the question it
 * answers is "is the block building or falling away", not "how much load in S34".
 */
export function ThreadLoadRuler({
  bars,
  className,
  anchorWeekKey = null,
  onAnchorChange,
}: {
  bars: readonly RulerBar[];
  className?: string;
  /** The week the list below is anchored on — the current one unless scrubbed. */
  anchorWeekKey?: string | null;
  onAnchorChange?: (weekKey: string) => void;
}) {
  const { mode } = useDisplayMode();
  const activeIndex = Math.max(
    0,
    bars.findIndex((bar) =>
      anchorWeekKey ? bar.weekKey === anchorWeekKey : bar.state === 'current',
    ),
  );

  const scrubber = useThreadScrubber({
    count: bars.length,
    activeIndex,
    onChange: (index) => {
      const bar = bars[index];
      if (bar) {
        onAnchorChange?.(bar.weekKey);
      }
    },
  });

  if (bars.length === 0) {
    return null;
  }

  const range = rulerRangeLabel(bars);
  const activeBar = bars[activeIndex];

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-label">Réglette de charge</p>
        {range ? <p className="text-data text-muted-foreground text-xs">{range}</p> : null}
      </div>

      <div
        ref={scrubber.trackRef}
        aria-label={onAnchorChange ? 'Semaine lue dans le fil' : undefined}
        aria-valuemax={onAnchorChange ? bars.length - 1 : undefined}
        aria-valuemin={onAnchorChange ? 0 : undefined}
        aria-valuenow={onAnchorChange ? activeIndex : undefined}
        aria-valuetext={onAnchorChange ? activeBar?.label : undefined}
        role={onAnchorChange ? 'slider' : undefined}
        tabIndex={onAnchorChange ? 0 : undefined}
        className={cn(
          'chip-surface-lg rounded-analysis-lg px-3 py-3',
          'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
          onAnchorChange && 'cursor-pointer touch-none select-none',
        )}
        {...(onAnchorChange ? scrubber.handlers : {})}
      >
        <div className="flex h-16 items-end gap-1.5" aria-hidden>
          {bars.map((bar, index) => (
            <div
              key={bar.weekKey}
              style={{ height: `${Math.max(6, bar.height * 100)}%` }}
              className={cn(
                'flex-1 rounded-[3px]',
                bar.state === 'future'
                  ? 'border-analysis-border border border-dashed'
                  : 'bg-muted-foreground/30',
                bar.state === 'current' && 'bg-primary ring-primary/30 ring-1',
                /* The week being read, when it is not the current one. */
                index === activeIndex &&
                  bar.state !== 'current' &&
                  'ring-primary/60 bg-primary/70 ring-1',
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
        {onAnchorChange ? 'Glisse pour te déplacer dans la saison. ' : ''}
        Plein = réalisé, pointillé = prévu.
      </p>

      <ul className="sr-only">
        {bars.map((bar) => (
          <li key={bar.weekKey}>
            {bar.label} · {barReading(bar, mode)}
          </li>
        ))}
      </ul>
    </div>
  );
}
