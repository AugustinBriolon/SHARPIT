'use client';

import { cn } from '@/lib/utils';
import {
  computePhysioRailProgress,
  physioMarkerColor,
} from '@/components/ui/instruments/physio-rail-helpers';

function PhysioRailTrack({
  progress,
  visibleProgress,
  markerColor,
  size,
  stops,
}: {
  progress: number | null;
  visibleProgress: number | null;
  markerColor: string;
  size: 'default' | 'slim';
  stops: string[];
}) {
  const gradient = `linear-gradient(90deg, ${stops.join(', ')})`;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-full bg-transparent',
        size === 'slim' ? 'h-1' : 'h-1.5',
      )}
    >
      {progress !== null ? (
        <div
          className="absolute inset-y-0 left-0 rounded-full opacity-95"
          style={{ width: `${visibleProgress}%`, backgroundImage: gradient }}
          aria-hidden
        />
      ) : null}
      <div className="absolute inset-0 rounded-full border border-black/6 dark:border-white/6" />
      {progress !== null ? (
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
  );
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
  size?: 'default' | 'slim';
  variant?: 'intensity' | 'availability';
  className?: string;
}) {
  const { progress, visibleProgress } = computePhysioRailProgress(value, max);
  const markerColor = physioMarkerColor(emphasis, progress);
  const stops =
    variant === 'availability'
      ? ['var(--color-signal-risk)', 'var(--color-signal-base)']
      : [
          'var(--color-signal-recovery)',
          'var(--color-signal-base)',
          'var(--color-signal-tempo)',
          'var(--color-signal-threshold)',
          'var(--color-signal-vo2)',
        ];

  return (
    <div className={cn('space-y-1.5', className)}>
      <PhysioRailTrack
        markerColor={markerColor}
        progress={progress}
        size={size}
        stops={stops}
        visibleProgress={visibleProgress}
      />
      {markerLabel ? (
        <p className="text-muted-foreground text-xs leading-none">{markerLabel}</p>
      ) : null}
    </div>
  );
}
