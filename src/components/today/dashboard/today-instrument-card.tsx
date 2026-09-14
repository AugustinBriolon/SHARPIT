import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TodayInstrumentCardProps = {
  title: string;
  subtitle?: string | null;
  icon: ReactNode;
  href: string;
  titleAttr?: string;
  className?: string;
  children?: ReactNode;
};

/**
 * Shared Today instrument chrome — title, optional subtitle, Lime icon well.
 * Sleep / recovery / regularity / nutrition all use this shell; body stays local.
 */
export function TodayInstrumentCard({
  title,
  subtitle = null,
  icon,
  href,
  titleAttr,
  className,
  children,
}: TodayInstrumentCardProps) {
  return (
    <Link
      href={href}
      title={titleAttr ?? `Voir le détail — ${title}`}
      className={cn(
        'chip-surface-lg hover:border-primary/35 group',
        'focus-visible:ring-primary/35 flex h-full w-full min-w-0 flex-col overflow-hidden',
        'rounded-2xl px-4 pt-4 pb-3.5 transition-[border-color,background-color] duration-150 ease-out',
        'focus-visible:ring-2 focus-visible:outline-hidden',
        className,
      )}
    >
      <span className="flex min-w-0 items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="text-foreground block text-sm font-semibold tracking-tight">
            {title}
          </span>
          {subtitle ? (
            <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
              {subtitle}
            </span>
          ) : null}
        </span>
        <span className="icon-well size-8 shrink-0" aria-hidden>
          {icon}
        </span>
      </span>
      {children}
    </Link>
  );
}

export function TodayInstrumentCardSkeleton({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'chip-surface-lg flex h-full min-h-0 w-full flex-col overflow-hidden',
        'rounded-2xl px-4 pt-4 pb-3.5',
        className,
      )}
    >
      <span className="flex min-w-0 items-start justify-between gap-3">
        <span className="text-foreground block text-sm font-semibold tracking-tight">{title}</span>
        <span className="bg-muted size-8 shrink-0 animate-pulse rounded-full" aria-hidden />
      </span>
      {children}
    </div>
  );
}
