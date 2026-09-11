'use client';

import Link from 'next/link';
import { Target } from 'lucide-react';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { cn } from '@/lib/utils';

/**
 * Quiet living goal link under the verdict plate — not a plate chip.
 * Deep-links to `/moi/objectifs#goal-{id}`.
 */
export function TodayGoalAnchor({
  loading = false,
  label,
  href,
  linkedToSession,
}: {
  loading?: boolean;
  label: string | null;
  href: string | null;
  linkedToSession: boolean;
}) {
  if (loading) {
    return (
      <div className="px-0.5" aria-hidden>
        <SkeletonDataValue heightClassName="h-4" widthClassName="w-48" />
      </div>
    );
  }

  if (!label || !href) {
    return null;
  }

  return (
    <div className="px-0.5">
      <Link
        href={href}
        className={cn(
          'text-muted-foreground hover:text-foreground inline-flex max-w-full items-center gap-1.5 text-xs font-medium',
          'transition-[color,transform] duration-150 ease-out',
          'motion-safe:active:scale-[var(--press-scale-small)]',
        )}
      >
        <Target className="size-3.5 shrink-0 opacity-70" strokeWidth={1.8} aria-hidden />
        <span className="min-w-0 truncate">
          {linkedToSession ? (
            <>
              <span className="text-foreground/80">Séance → </span>
              {label}
            </>
          ) : (
            label
          )}
        </span>
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
