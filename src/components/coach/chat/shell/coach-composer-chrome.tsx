'use client';

import type { ReactNode } from 'react';
import { CoachPromptBar } from '@/components/coach/chat/composer/coach-prompt-bar';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';
import { cn } from '@/lib/utils';

/**
 * Shared footer shell for the coach composer — live chat and skeletons must
 * share this so loading never flashes a different layout.
 */
export function CoachComposerShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-background/95 supports-backdrop-filter:bg-background/80 shrink-0 px-3 pt-1.5 sm:px-4 sm:pt-2',
        // Immersive coach fills the viewport (no floating tab bar). Keep a light
        // bottom pad plus the device safe-area so the prompt clears the home indicator.
        'pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Disabled composer matching live Prompt Bar chrome — skeletons only. */
export function CoachComposerChrome({
  disabled = true,
  placeholder = coachBeuiCopy.composerPlaceholder,
  value = '',
  attachedContext = null,
}: {
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  attachedContext?:
    import('@/lib/coach/chat/discuss/coach-discuss-context').CoachDiscussContext | null;
  /** @deprecated chips live inside CoachPromptBar */
  contextSlot?: ReactNode;
}) {
  return (
    <CoachComposerShell>
      <CoachPromptBar
        ariaLabel={coachBeuiCopy.composerAriaLabel}
        attachedContext={attachedContext}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onDetachContext={attachedContext ? () => undefined : undefined}
        onSubmit={() => undefined}
        onValueChange={() => undefined}
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
