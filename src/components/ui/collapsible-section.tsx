'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A section the reader opens when they want it.
 *
 * Screens that stack every section at equal weight force the athlete to read
 * everything to find the one thing they came for. Folding is not hiding: the
 * summary carries enough to decide whether opening is worth it.
 */
export function CollapsibleSection({
  icon: Icon,
  label,
  summary,
  defaultOpen = false,
  className,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  /** Read without opening — the value, not a teaser. */
  summary?: string | null;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <details
      className={cn('group border-analysis-border/60 border-t', className)}
      open={defaultOpen}
    >
      <summary className="hover:text-foreground flex cursor-pointer list-none items-center justify-between gap-2 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
        <span className="text-foreground/85 inline-flex min-w-0 items-center gap-1.5 font-medium">
          {Icon ? <Icon className="text-muted-foreground size-3.5 shrink-0" /> : null}
          {label}
        </span>
        <span className="text-muted-foreground/70 inline-flex min-w-0 items-center gap-1.5">
          {summary ? <span className="text-data truncate text-xs">{summary}</span> : null}
          <ChevronRight className="size-3.5 shrink-0 transition-transform group-open:rotate-90" />
        </span>
      </summary>
      <div className="pt-1 pb-3">{children}</div>
    </details>
  );
}
