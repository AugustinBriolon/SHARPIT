'use client';

import { cn } from '@/lib/utils';

const INTENSITY_STOPS = [
  'var(--color-signal-recovery)',
  'var(--color-signal-base)',
  'var(--color-signal-tempo)',
  'var(--color-signal-threshold)',
  'var(--color-signal-vo2)',
];

/** Two-stop availability scale for Today / readiness (not intensity spectrum). */
const AVAILABILITY_STOPS = ['var(--color-signal-risk)', 'var(--color-signal-base)'];

function railGradient(stops: string[]) {
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

export function PhysioRail({
  value,
  max,
  markerLabel,
  emphasis = 'auto',
  size = 'default',
  variant = 'intensity',
  className,
}: {
  value: number | null;
  max: number;
  markerLabel?: string | null;
  emphasis?: 'auto' | 'neutral';
  /** default: 6px (verdict panels) · slim: 4px (metric cards) */
  size?: 'default' | 'slim';
  /** intensity: multi-zone spectrum · availability: low→high readiness (2 stops) */
  variant?: 'intensity' | 'availability';
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

  const stops = variant === 'availability' ? AVAILABILITY_STOPS : INTENSITY_STOPS;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-full bg-transparent',
          size === 'slim' ? 'h-1' : 'h-1.5',
        )}
      >
        {progress != null ? (
          <div
            className="absolute inset-y-0 left-0 rounded-full opacity-95"
            style={{
              width: `${visibleProgress}%`,
              backgroundImage: railGradient(stops),
            }}
            aria-hidden
          />
        ) : null}
        <div className="absolute inset-0 rounded-full border border-black/6 dark:border-white/6" />
        {progress != null ? (
          <div
            className="border-background absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{
              left: `${progress}%`,
              height: size === 'slim' ? '0.625rem' : '0.875rem',
              width: '3px',
              backgroundColor: markerColor,
            }}
            aria-hidden
          />
        ) : null}
      </div>
      {markerLabel ? (
        <p className="text-muted-foreground text-[10px] leading-none">{markerLabel}</p>
      ) : null}
    </div>
  );
}
