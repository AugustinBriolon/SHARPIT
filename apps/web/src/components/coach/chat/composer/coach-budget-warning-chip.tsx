'use client';

import { formatBudgetRetryEta } from '@/lib/access/ai-budget-shared';
import { cn } from '@/lib/utils';

/**
 * Persistent tag above the composer, mirroring CoachContextChip's shape in
 * caution tone — shown as long as the athlete is near today's AI budget (see
 * ai-budget.ts). No dismiss: it clears itself once a response comes back
 * without the warning header (budget recovered, or the athlete went Pro),
 * so there is nothing here to leave stale after a toast would have faded.
 */
export function CoachBudgetWarningChip({ className }: { className?: string }) {
  return (
    <div className={cn('mb-1.5 w-fit max-w-full pt-1.5 pr-1.5', className)}>
      <div
        className={cn(
          'bg-signal-caution/10 text-signal-caution ring-signal-caution/30',
          'inline-flex w-fit max-w-full items-center rounded-full px-2.5 py-1 ring-1 ring-inset',
        )}
      >
        <span className="truncate text-xs font-medium tracking-tight">
          Limite d’échanges bientôt atteinte
        </span>
      </div>
    </div>
  );
}

/**
 * Shown instead of the warning chip once the budget is actually spent — the
 * composer is disabled at the same time (see useCoachChat's `inputLocked`).
 * This is UX only: `ensureFreeAiBudget` re-checks server-side on every
 * request no matter what the client renders or a devtools edit removes.
 */
export function CoachBudgetBlockedChip({
  retryAfterSeconds,
  className,
}: {
  retryAfterSeconds: number;
  className?: string;
}) {
  return (
    <div className={cn('mb-1.5 w-fit max-w-full pt-1.5 pr-1.5', className)}>
      <div
        className={cn(
          'bg-destructive/10 text-destructive ring-destructive/30',
          'inline-flex w-fit max-w-full items-center rounded-full px-2.5 py-1 ring-1 ring-inset',
        )}
      >
        <span className="truncate text-xs font-medium tracking-tight">
          Limite atteinte · réessaie {formatBudgetRetryEta(retryAfterSeconds)}
        </span>
      </div>
    </div>
  );
}
