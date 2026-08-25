'use client';

import { X } from 'lucide-react';
import type { CoachDiscussContext } from '@/lib/coach/chat/coach-discuss-context';
import { cn } from '@/lib/utils';

/**
 * Context tag above the composer — width follows the label. Dismiss sits outside
 * the pill (notification-badge style) and appears on hover, or stays visible on touch.
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
    <div className={cn('group/tag relative mb-1.5 w-fit max-w-full pt-1.5 pr-1.5', className)}>
      <div
        className={cn(
          'bg-muted/70 text-foreground ring-border/60',
          'inline-flex w-fit max-w-full items-center rounded-full px-2.5 py-1',
          'group-hover/tag:bg-muted ring-1 transition-colors ring-inset',
        )}
      >
        <span className="truncate text-xs font-medium tracking-tight" title={context.label}>
          {context.label}
        </span>
      </div>
      <button
        aria-label={`Retirer le contexte · ${context.label}`}
        type="button"
        className={cn(
          'bg-background text-muted-foreground ring-border/70 shadow-sm',
          'hover:text-foreground hover:bg-muted absolute top-2 right-2 z-10',
          'inline-flex size-5 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ring-1',
          'focus-visible:ring-ring transition-opacity focus-visible:ring-2 focus-visible:outline-hidden',
          '[@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:opacity-0',
          '[@media(hover:hover)]:group-hover/tag:pointer-events-auto [@media(hover:hover)]:group-hover/tag:opacity-100',
          '[@media(hover:hover)]:group-focus-within/tag:pointer-events-auto [@media(hover:hover)]:group-focus-within/tag:opacity-100',
          'focus-visible:pointer-events-auto focus-visible:opacity-100',
        )}
        onClick={onDetach}
      >
        <X className="size-3" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}
