'use client';

import type { ReactNode } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
        'pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md',
        className,
      )}
    >
      {contextSlot}
      <div className={cn('border-border/50 border-t', contextSlot ? 'mt-2.5 pt-2.5' : 'pt-2.5')}>
        <div
          className={cn(
            'chip-surface-lg border-border/70 rounded-[1.75rem] border p-2.5 shadow-sm',
            'focus-within:border-ring/50 focus-within:ring-ring/25 transition-[box-shadow,border-color] focus-within:ring-2',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Disabled composer matching live chrome — used by empty + thread skeletons. */
export function CoachComposerChrome({
  disabled = true,
  placeholder = 'Demande conseil à ton coach…',
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
      <Textarea
        aria-label="Message au coach"
        disabled={disabled}
        placeholder={placeholder}
        readOnly={disabled}
        rows={1}
        value={value}
        className={cn(
          'max-h-40 min-h-11 resize-none border-0 bg-transparent px-2.5 py-2 shadow-none',
          'focus-visible:border-transparent focus-visible:ring-0',
          'placeholder:text-muted-foreground/80',
        )}
      />
      <div className="mt-1 flex items-center justify-end gap-1.5 px-0.5">
        <Button
          aria-label="Envoyer le message"
          className="size-9 shrink-0 rounded-full"
          size="icon"
          type="button"
          variant="highlight"
          disabled
        >
          <ArrowUp className="size-4" strokeWidth={2.5} aria-hidden />
        </Button>
      </div>
    </CoachComposerShell>
  );
}

/** Pulsing context tag placeholder while a discuss target is resolving. */
export function CoachContextTagSkeleton() {
  return (
    <div className="flex min-w-0" aria-hidden>
      <div className="bg-muted/70 ring-border/60 inline-flex max-w-full min-w-0 items-center rounded-full py-1 pr-1 pl-2.5 ring-1 ring-inset">
        <span className="bg-muted-foreground/25 h-3 w-28 max-w-[50vw] animate-pulse rounded-full" />
        <span className="size-5 shrink-0" />
      </div>
    </div>
  );
}
