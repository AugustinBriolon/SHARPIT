import type { SleepStageKey } from '@/lib/today/signal-previews';
import { cn } from '@/lib/utils';

const STAGE_COLOR: Record<SleepStageKey, string> = {
  deep: 'bg-[var(--color-signal-recovery)]',
  rem: 'bg-[var(--color-signal-vo2)]',
  light: 'bg-[var(--color-signal-base)]',
  awake: 'bg-[var(--color-signal-caution)]',
};

/**
 * Compact horizontal sleep-stage bar for Today signal chips.
 */
export function SignalStageBar({
  stages,
  className,
}: {
  stages: Array<{ key: SleepStageKey; fraction: number }>;
  className?: string;
}) {
  if (stages.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('bg-muted/40 flex h-2 w-full overflow-hidden rounded-full', className)}
      aria-hidden
    >
      {stages.map((stage) => (
        <span
          key={stage.key}
          className={cn('h-full min-w-px', STAGE_COLOR[stage.key])}
          style={{ flexGrow: stage.fraction, flexBasis: 0 }}
        />
      ))}
    </div>
  );
}
