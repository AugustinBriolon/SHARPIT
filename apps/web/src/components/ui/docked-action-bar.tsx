'use client';

import { cn } from '@sharpit/app/lib/utils';

/**
 * Action row pinned to the bottom of the viewport on a phone, sticky in flow
 * from `sm`. One definition, because two surfaces need the exact same bar —
 * the onboarding step shell and the goal form docked inside it — and a copy in
 * each would drift.
 *
 * Two constraints on callers:
 *
 * 1. Reserve its height in the scrolling content. A fixed bar is out of flow
 *    and would otherwise hide the last control.
 * 2. No ancestor may set `overflow` to anything but `visible` or `clip`, and
 *    none may carry a transform. The first turns that ancestor into the
 *    scrollport `sticky` resolves against; the second makes it the containing
 *    block for `fixed`. Either one silently breaks this bar.
 */
export function DockedActionBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-background border-border/60 z-30 flex flex-col gap-2 border-t',
        'max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:px-6 max-sm:pt-3',
        'max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        'sm:sticky sm:bottom-0 sm:mt-5 sm:flex-row sm:items-center sm:justify-end sm:pt-3',
        'sm:pb-[max(0.5rem,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      {children}
    </div>
  );
}
