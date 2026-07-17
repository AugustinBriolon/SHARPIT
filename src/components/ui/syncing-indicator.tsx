'use client';

import { useIsMutating } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

/**
 * Subtle background-sync affordance while Instant mutations are in flight.
 * Never blocks navigation or replaces content.
 */
export function SyncingIndicator({ className }: { className?: string }) {
  const mutating = useIsMutating();
  if (mutating === 0) return null;

  return (
    <div
      aria-live="polite"
      role="status"
      className={cn(
        'text-muted-foreground flex items-center justify-center gap-2 px-4 py-1 text-[11px]',
        className,
      )}
    >
      <span className="bg-primary/70 size-1.5 animate-pulse rounded-full" aria-hidden />
      Synchronisation en cours
    </div>
  );
}
