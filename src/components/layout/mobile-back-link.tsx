'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useBackTarget } from '@/hooks/use-back-target';
import { cn } from '@/lib/utils';

/**
 * Back link — dynamic by default (reads the app-managed nav stack).
 * Pages can force a static parent via `href` + `label` (e.g. edit → detail),
 * or provide a `fallbackHref` + `fallbackLabel` that only applies when the
 * stack is empty (deep-link entry). Otherwise the registry decides.
 */
export function MobileBackLink({
  href,
  label,
  fallbackHref,
  fallbackLabel,
  className,
  showOnDesktop = false,
}: {
  /** Force a static destination (opt-out of the dynamic stack). */
  href?: string;
  /** Force a static label (requires href). */
  label?: string;
  /** Override the registry default when the stack is empty. */
  fallbackHref?: string;
  /** Override the registry default label when the stack is empty. */
  fallbackLabel?: string;
  className?: string;
  /** Affiche le lien sur desktop aussi (défaut : mobile uniquement). */
  showOnDesktop?: boolean;
}) {
  const overrideFallback =
    fallbackHref && fallbackLabel ? { href: fallbackHref, label: fallbackLabel } : undefined;
  const dynamicTarget = useBackTarget(overrideFallback);
  const staticOverride = href && label ? { href, label } : null;
  const target = staticOverride ?? dynamicTarget;

  return (
    <>
      <Link
        href={target.href}
        className={cn(
          'text-muted-foreground hover:text-foreground bg-background/80 fixed inset-x-0 top-0 z-50 flex min-h-14 items-center gap-1 px-4 text-sm backdrop-blur-sm transition-colors lg:static lg:mb-3 lg:min-h-11 lg:bg-transparent lg:px-0 lg:backdrop-blur-none',
          !showOnDesktop && 'lg:hidden',
          className,
        )}
      >
        <ChevronLeft className="size-4 shrink-0" aria-hidden />
        {target.label}
      </Link>
      <div className="h-14 lg:hidden" aria-hidden />
    </>
  );
}
