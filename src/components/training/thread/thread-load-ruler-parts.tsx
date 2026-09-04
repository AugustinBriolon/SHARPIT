'use client';

import type { RulerBar } from '@/lib/training/thread/load-ruler';
import { cn } from '@/lib/utils';

export function RulerBarStrip({
  bars,
  activeIndex,
}: {
  bars: readonly RulerBar[];
  activeIndex: number;
}) {
  return (
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
            index === activeIndex &&
              bar.state !== 'current' &&
              'ring-primary/60 bg-primary/70 ring-1',
          )}
        />
      ))}
    </div>
  );
}

export function RulerBarLabels({
  bars,
  activeIndex: _activeIndex,
}: {
  bars: readonly RulerBar[];
  activeIndex: number;
}) {
  return (
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
  );
}
