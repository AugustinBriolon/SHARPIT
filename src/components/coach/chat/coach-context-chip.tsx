'use client';

import { X } from 'lucide-react';
import type { CoachDiscussContext } from '@/lib/coach/chat/coach-discuss-context';
import { cn } from '@/lib/utils';

/**
 * Context tag above the composer. The dismiss control appears on hover
 * (always visible when the pointer cannot hover).
 */
export function CoachContextChip({
  context,
  onDetach,
  className,
}: {
  context: CoachDiscussContext;
  onDetach: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0', className)}>
      <div
        className={cn(
          'group/tag bg-muted/70 text-foreground ring-border/60',
          'inline-flex max-w-full min-w-0 items-center gap-1 rounded-full py-1 pr-1 pl-2.5',
          'hover:bg-muted ring-1 transition-colors ring-inset',
        )}
      >
        <span className="truncate text-xs font-medium tracking-tight">{context.label}</span>
        <button
          aria-label={`Retirer le contexte · ${context.label}`}
          type="button"
          className={cn(
            'text-muted-foreground hover:text-foreground hover:bg-foreground/8',
            'focus-visible:ring-ring shrink-0 rounded-full p-1 transition-opacity',
            'focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-hidden',
            'opacity-100 [@media(hover:hover)]:opacity-0',
            '[@media(hover:hover)]:group-hover/tag:opacity-100',
            '[@media(hover:hover)]:group-focus-within/tag:opacity-100',
          )}
          onClick={onDetach}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
