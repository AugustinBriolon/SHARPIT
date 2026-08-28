'use client';

import type { RulerBar } from '@/lib/training/thread/load-ruler';
import { cn } from '@/lib/utils';
import {
  RulerBarLabels,
  RulerBarStrip,
} from '@/components/training/thread/thread-load-ruler-parts';
import { buildRulerSliderA11y } from '@/components/training/thread/thread-load-ruler-a11y';

export function RulerScrubberTrack({
  bars,
  activeIndex,
  activeBar,
  interactive,
  scrubber,
}: {
  bars: readonly RulerBar[];
  activeIndex: number;
  activeBar: RulerBar | undefined;
  interactive: boolean;
  scrubber: {
    trackRef: React.Ref<HTMLDivElement>;
    handlers: Record<string, unknown>;
  };
}) {
  const a11y = buildRulerSliderA11y({ interactive, bars, activeIndex, activeBar });

  return (
    <div
      ref={scrubber.trackRef}
      className={cn(
        'chip-surface-lg rounded-analysis-lg px-3 py-3',
        'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
        interactive && 'cursor-pointer touch-none select-none',
      )}
      {...a11y}
      {...(interactive ? scrubber.handlers : {})}
    >
      <RulerBarStrip activeIndex={activeIndex} bars={bars} />
      <RulerBarLabels activeIndex={activeIndex} bars={bars} />
    </div>
  );
}
