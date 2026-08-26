'use client';

import type { ReactNode } from 'react';
import { PromptInput } from '@/components/agents/prompt-input';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import { coachBeuiTheme } from '@/components/coach/beui/coach-beui-theme';
import { cn } from '@/lib/utils';

/**
 * Shared footer shell for the coach composer — live chat and skeletons must
 * share this so loading never flashes the old side-by-side layout.
 */
export function CoachComposerShell({
  contextSlot,
  children,
  className,
}: {
  contextSlot?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-background/95 supports-backdrop-filter:bg-background/80 shrink-0 px-3 pt-2',
        // Below `lg` the composer sits inside the mobile hub, which is already
        // anchored above the bottom nav via `--bottom-nav-offset` — that offset
        // bakes in `env(safe-area-inset-bottom)`, so adding it again here doubled
        // the gap above the nav on notched phones. Only `lg` (no bottom nav,
        // composer owns its own safe area) needs the full inset.
        'pb-3 backdrop-blur-md lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      {contextSlot}
      <div
        className={cn(
          'chip-surface-lg border-border/70 rounded-[1.75rem] border p-2.5 shadow-sm',
          'focus-within:border-ring/50 focus-within:ring-ring/25 transition-[box-shadow,border-color] focus-within:ring-2',
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Disabled composer matching live beUI PromptInput chrome — skeletons only. */
export function CoachComposerChrome({
  disabled = true,
  placeholder = coachBeuiCopy.composerPlaceholder,
  value = '',
  contextSlot,
}: {
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  contextSlot?: ReactNode;
}) {
  return (
    <CoachComposerShell contextSlot={contextSlot}>
      <PromptInput
        aria-label={coachBeuiCopy.composerAriaLabel}
        className={coachBeuiTheme.promptInput}
        disabled={disabled}
        minRows={1}
        placeholder={placeholder}
        readOnly={disabled}
        value={value}
      />
    </CoachComposerShell>
  );
}

/** Pulsing context tag placeholder while a discuss target is resolving. */
export function CoachContextTagSkeleton() {
  return (
    <div className="relative mb-1.5 w-fit max-w-full pt-1.5 pr-1.5" aria-hidden>
      <div className="bg-muted/70 ring-border/60 inline-flex w-fit items-center rounded-full px-2.5 py-1 ring-1 ring-inset">
        <span className="bg-muted-foreground/25 h-3 w-28 max-w-[50vw] animate-pulse rounded-full" />
      </div>
    </div>
  );
}
