'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useBackTarget } from '@/hooks/use-back-target';
import { cn } from '@/lib/utils';

function canUseHistoryBack(): boolean {
  if (typeof performance === 'undefined') return false;
  const entry = performance.getEntriesByType('navigation')[0] as
    PerformanceNavigationTiming | undefined;
  // After a full reload the browser history stack is shallow — prefer Link.
  return entry?.type !== 'reload';
}

/**
 * Back link — dynamic by default (reads the app-managed nav stack).
 * Pages can force a static parent via `href` + `label` (e.g. edit → detail),
 * or provide a `fallbackHref` + `fallbackLabel` that only applies when the
 * stack is empty (deep-link entry). Otherwise the registry decides.
 *
 * When the destination comes from the stack (in-app exploration), we prefer
 * `router.back()` so Next can restore the previous route from the client
 * router cache instead of remounting a cold RSC fetch + loading skeleton.
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
  const router = useRouter();
  const overrideFallback =
    fallbackHref && fallbackLabel ? { href: fallbackHref, label: fallbackLabel } : undefined;
  const dynamicTarget = useBackTarget(overrideFallback);
  const staticOverride = href && label ? { href, label, fromStack: false as const } : null;
  const target = staticOverride ?? dynamicTarget;
  const preferHistoryBack = !staticOverride && target.fromStack && canUseHistoryBack();

  return (
    <>
      <Link
        href={target.href}
        className={cn(
          'text-muted-foreground hover:text-foreground bg-background/80 fixed inset-x-0 top-0 z-50 flex min-h-14 items-center gap-1 px-4 text-sm backdrop-blur-sm transition-colors lg:static lg:mb-3 lg:min-h-11 lg:bg-transparent lg:px-0 lg:backdrop-blur-none',
          !showOnDesktop && 'lg:hidden',
          className,
        )}
        onClick={(event) => {
          if (!preferHistoryBack) return;
          event.preventDefault();
          router.back();
        }}
      >
        <ChevronLeft className="size-4 shrink-0" aria-hidden />
        {target.label}
      </Link>
      <div className="h-14 lg:hidden" aria-hidden />
    </>
  );
}
