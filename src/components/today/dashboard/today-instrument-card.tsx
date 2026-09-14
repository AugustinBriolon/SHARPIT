import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Two tiers, because one filled surface on every block flattens the hierarchy
 * it was meant to create: `surface` is consultable evidence the athlete opens,
 * `quiet` is context that only has to stay legible beside it.
 */
export type TodayInstrumentTier = 'surface' | 'quiet';

const TIER_CLASS: Record<TodayInstrumentTier, string> = {
  surface: 'chip-surface-lg',
  quiet: 'chip-surface-quiet',
};

function shellClass(tier: TodayInstrumentTier): string {
  return cn(
    TIER_CLASS[tier],
    'hover:border-primary/35 group',
    'focus-visible:ring-primary/35 flex h-full w-full min-w-0 flex-col overflow-hidden',
    'rounded-2xl px-4 pt-4 pb-3.5 transition-[border-color,background-color] duration-150 ease-out',
    'focus-visible:ring-2 focus-visible:outline-hidden',
  );
}

export type TodayInstrumentCardProps = {
  title: string;
  subtitle?: string | null;
  icon: ReactNode;
  /** Omit for static shells with nested controls (ex. Plan vivant tension). */
  href?: string | null;
  titleAttr?: string;
  /** `quiet` drops the fill and keeps the hairline. Defaults to `surface`. */
  tier?: TodayInstrumentTier;
  className?: string;
  children?: ReactNode;
};

/**
 * Shared Today instrument chrome — title, optional subtitle, Lime icon well.
 * Sleep / recovery / regularity / nutrition / Plan vivant all use this shell.
 * With `href`: whole card navigates. Without: static shell for nested controls.
 */
export function TodayInstrumentCard({
  title,
  subtitle = null,
  icon,
  href,
  titleAttr,
  tier = 'surface',
  className,
  children,
}: TodayInstrumentCardProps) {
  const header = (
    <span className="flex min-w-0 items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="text-foreground block text-sm font-semibold tracking-tight">{title}</span>
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
  );

  if (href) {
    return (
      <Link
        className={cn(shellClass(tier), className)}
        href={href}
        title={titleAttr ?? `Voir le détail — ${title}`}
      >
        {header}
        {children}
      </Link>
    );
  }

  return (
    <article aria-label={titleAttr ?? title} className={cn(shellClass(tier), className)}>
      {header}
      {children}
    </article>
  );
}

export function TodayInstrumentCardSkeleton({
  title,
  tier = 'surface',
  className,
  children,
}: {
  title: string;
  /** Must match the loaded card's tier, or the surface swaps on arrival. */
  tier?: TodayInstrumentTier;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        TIER_CLASS[tier],
        'flex h-full min-h-0 w-full flex-col overflow-hidden',
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
