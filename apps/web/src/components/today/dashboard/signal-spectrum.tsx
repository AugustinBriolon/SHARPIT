import { cn } from '@/lib/utils';

/**
 * Restrained 0–100 spectrum with a position marker for adaptation readings.
 * Uses signal tokens — not a consumer rainbow scale.
 */
export function SignalSpectrum({ position, className }: { position: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, position));

  return (
    <div className={cn('relative h-2 w-full', className)} aria-hidden>
      <div
        className={cn(
          'h-full w-full rounded-full',
          'bg-[linear-gradient(to_right,var(--color-signal-risk),var(--color-signal-caution),var(--color-signal-recovery),var(--color-signal-base))]',
          'opacity-80',
        )}
      />
      <span
        className="border-background bg-foreground absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
        style={{ left: `${clamped}%` }}
      />
    </div>
  );
}
