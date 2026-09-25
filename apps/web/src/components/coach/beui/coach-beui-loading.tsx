'use client';

import { cn } from '@/lib/utils';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';

/** Static pulse loading — no shimmer (DESIGN_LANGUAGE). */
export function CoachBeuiLoadingStatus({
  label = coachBeuiCopy.drafting,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      aria-live="polite"
      role="status"
      className={cn(
        'text-muted-foreground inline-flex animate-pulse items-center gap-1.5 text-xs font-medium motion-reduce:animate-none',
        className,
      )}
    >
      {label}
    </span>
  );
}
