'use client';

import type { RulerBar } from '@/lib/training/thread/load-ruler';
import { rulerRangeLabel } from '@/lib/training/thread/load-ruler';
import { formatTrainingLoad } from '@/lib/preferences/display-mode';
import { useThreadScrubber } from '@/hooks/use-thread-scrubber';
import { useDisplayMode } from '@/providers/display-mode-provider';
import { RulerScrubberTrack } from '@/components/training/thread/thread-load-ruler-track';

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

function RulerScreenReaderList({
  bars,
  mode,
}: {
  bars: readonly RulerBar[];
  mode: 'essential' | 'expert';
}) {
  return (
    <ul className="sr-only">
      {bars.map((bar) => (
        <li key={bar.weekKey}>
          {bar.label} · {barReading(bar, mode)}
        </li>
      ))}
    </ul>
  );
}

export function ThreadLoadRuler({
  bars,
  className,
  anchorWeekKey = null,
  onAnchorChange,
}: {
  bars: readonly RulerBar[];
  className?: string;
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
  const interactive = Boolean(onAnchorChange);

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-label">Réglette de charge</p>
        {range ? <p className="text-data text-muted-foreground text-xs">{range}</p> : null}
      </div>

      <RulerScrubberTrack
        activeBar={activeBar}
        activeIndex={activeIndex}
        bars={bars}
        interactive={interactive}
        scrubber={scrubber}
      />

      <p className="text-muted-foreground mt-1.5 text-[11px]">
        {interactive ? 'Glisse pour te déplacer dans la saison. ' : ''}
        Plein = réalisé, pointillé = prévu.
      </p>

      <RulerScreenReaderList bars={bars} mode={mode} />
    </div>
  );
}
