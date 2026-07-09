'use client';

import { cn } from '@/lib/utils';

const RAIL_STOPS = [
  'var(--color-signal-recovery)',
  'var(--color-signal-base)',
  'var(--color-signal-tempo)',
  'var(--color-signal-threshold)',
  'var(--color-signal-vo2)',
];

function railGradient() {
  return `linear-gradient(90deg, ${RAIL_STOPS.join(', ')})`;
}

export function PhysioRail({
  value,
  max,
  markerLabel,
  emphasis = 'auto',
  className,
}: {
  value: number | null;
  max: number;
  markerLabel?: string | null;
  emphasis?: 'auto' | 'neutral';
  className?: string;
}) {
  const progress =
    value == null || max <= 0 ? null : Math.max(0, Math.min(100, (value / max) * 100));
  let visibleProgress: number | null = progress;
  if (progress != null && progress > 0) {
    visibleProgress = Math.max(progress, 7);
  }
  let markerColor = 'var(--color-signal-neutral)';
  if (emphasis !== 'neutral' && progress != null) {
    if (progress < 34) markerColor = 'var(--color-signal-risk)';
    else if (progress < 67) markerColor = 'var(--color-signal-caution)';
    else markerColor = 'var(--color-primary)';
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="bg-muted/80 relative h-2.5 overflow-hidden rounded-full">
        {progress != null ? (
          <div
            className="absolute inset-y-0 left-0 rounded-full opacity-95"
            style={{
              width: `${visibleProgress}%`,
              backgroundImage: railGradient(),
            }}
            aria-hidden
          />
        ) : null}
        <div className="absolute inset-px rounded-full border border-black/6 dark:border-white/6" />
        {progress != null ? (
          <div
            className="border-background absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full border shadow-sm"
            style={{
              left: `${progress}%`,
              backgroundColor: markerColor,
            }}
            aria-hidden
          />
        ) : (
          <div className="bg-analysis-surface/70 absolute inset-0" />
        )}
      </div>
      {markerLabel ? (
        <p className="text-muted-foreground text-[10px] leading-none">{markerLabel}</p>
      ) : null}
    </div>
  );
}
