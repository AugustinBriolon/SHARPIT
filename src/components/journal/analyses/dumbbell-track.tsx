import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ObservationPolarity } from '@/lib/health/journal-habit-analysis';
import type { AxisPosition, AxisTick } from '@/lib/health/journal-habit-axis';
import { cn } from '@/lib/utils';
import { DUMBBELL_TRACK_BOX } from './dumbbell-grid';

/** The gap's colour codes polarity only: sage when favourable, amber when not. */
const GAP_TONE: Record<ObservationPolarity, { solid: string; dashed: string }> = {
  plus: { solid: 'bg-primary', dashed: 'border-primary' },
  minus: { solid: 'bg-signal-caution', dashed: 'border-signal-caution' },
};

function leftOf(position: { pct: number }) {
  return { left: `${position.pct}%` };
}

export function AxisTicks({ ticks }: { ticks: readonly AxisTick[] }) {
  return (
    <span className={cn(DUMBBELL_TRACK_BOX, 'h-4')} aria-hidden>
      {ticks.map((tick) => (
        <span
          key={tick.value}
          className="text-muted-foreground text-data absolute top-0 -translate-x-1/2 text-xs whitespace-nowrap"
          style={leftOf(tick)}
        >
          {tick.label}
        </span>
      ))}
    </span>
  );
}

export function TickGuides({ ticks }: { ticks: readonly AxisTick[] }) {
  return ticks.map((tick) => (
    <span
      key={tick.value}
      className="bg-analysis-border/50 absolute inset-y-0 w-px -translate-x-1/2"
      style={leftOf(tick)}
      aria-hidden
    />
  ));
}

function OverflowMark({ position }: { position: AxisPosition }) {
  if (!position.overflow) {
    return null;
  }
  const Icon = position.overflow === 'low' ? ChevronLeft : ChevronRight;
  return (
    <Icon
      strokeWidth={2}
      className={cn(
        'text-muted-foreground absolute top-1/2 size-3 -translate-y-1/2',
        position.overflow === 'low' ? '-left-3' : '-right-3',
      )}
      aria-hidden
    />
  );
}

/** Hollow = median without the habit, filled = with it. */
export function AxisPoint({
  position,
  variant,
  small = false,
}: {
  position: AxisPosition;
  variant: 'with' | 'without';
  small?: boolean;
}) {
  return (
    <span
      style={leftOf(position)}
      className={cn(
        'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full',
        small ? 'size-1.5' : 'size-3',
        variant === 'with'
          ? 'bg-foreground'
          : cn('bg-analysis-surface border-muted-foreground', small ? 'border' : 'border-2'),
      )}
      aria-hidden
    />
  );
}

export function DumbbellTrack({
  without,
  withHabit,
  polarity,
  weak,
  ticks,
  ariaLabel,
}: {
  without: AxisPosition;
  withHabit: AxisPosition;
  polarity: ObservationPolarity;
  weak: boolean;
  ticks: readonly AxisTick[];
  ariaLabel: string;
}) {
  const tone = GAP_TONE[polarity];
  const start = Math.min(without.pct, withHabit.pct);
  const width = Math.abs(withHabit.pct - without.pct);

  return (
    <span aria-label={ariaLabel} className={cn(DUMBBELL_TRACK_BOX, 'h-5')} role="img">
      <TickGuides ticks={ticks} />
      <span className="bg-analysis-border absolute inset-x-0 top-1/2 h-px" aria-hidden />
      <span
        style={{ left: `${start}%`, width: `${width}%` }}
        className={cn(
          'absolute top-1/2 -translate-y-1/2',
          weak
            ? cn('h-0 border-t-2 border-dashed', tone.dashed)
            : cn('h-1.5 rounded-full', tone.solid),
        )}
        aria-hidden
      />
      <AxisPoint position={without} variant="without" />
      <AxisPoint position={withHabit} variant="with" />
      <OverflowMark position={without} />
      <OverflowMark position={withHabit} />
    </span>
  );
}
