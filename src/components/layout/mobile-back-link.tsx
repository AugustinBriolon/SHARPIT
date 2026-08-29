'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useBackTarget } from '@/hooks/use-back-target';
import { floatingHeaderButtonClass } from '@/components/layout/floating-header-button';
import { cn } from '@/lib/utils';

function canUseHistoryBack(): boolean {
  if (typeof performance === 'undefined') {
    return false;
  }
  const entry = performance.getEntriesByType('navigation')[0] as
    PerformanceNavigationTiming | undefined;
  // After a full reload the browser history stack is shallow — prefer Link.
  return entry?.type !== 'reload';
}

type MobileBackLinkProps = {
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
};

function BackLinkChrome({
  href,
  label,
  className,
  showOnDesktop,
  onClick,
}: {
  href: string;
  label: React.ReactNode;
  className?: string;
  showOnDesktop: boolean;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <>
      <Link
        href={href}
        aria-label={typeof label === 'string' ? label : undefined}
        className={cn(
          floatingHeaderButtonClass('left'),
          'lg:mb-3 lg:justify-start lg:gap-1 lg:px-0 lg:text-muted-foreground',
          !showOnDesktop && 'lg:hidden',
          className,
        )}
        onClick={onClick}
      >
        <ChevronLeft className="size-5 shrink-0 lg:size-4" aria-hidden />
        <span className="hidden text-sm lg:inline">{label}</span>
      </Link>
      <div className="h-14 lg:hidden" aria-hidden />
    </>
  );
}

function DynamicBackLink({
  fallbackHref,
  fallbackLabel,
  className,
  showOnDesktop,
}: Omit<MobileBackLinkProps, 'href' | 'label'> & { showOnDesktop: boolean }) {
  const router = useRouter();
  const overrideFallback =
    fallbackHref && fallbackLabel ? { href: fallbackHref, label: fallbackLabel } : undefined;
  const target = useBackTarget(overrideFallback);
  const preferHistoryBack = target.fromStack && canUseHistoryBack();

  return (
    <BackLinkChrome
      className={className}
      href={target.href}
      label={target.label}
      showOnDesktop={showOnDesktop}
      onClick={(event) => {
        if (!preferHistoryBack) {
          return;
        }
        event.preventDefault();
        router.back();
      }}
    />
  );
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
 *
 * A static destination reads nothing from the URL, so it renders directly and
 * lands in the prerendered shell. The dynamic form waits behind a boundary and
 * streams its label in; the row reserves its height either way, so nothing
 * shifts.
 */
export function MobileBackLink({
  href,
  label,
  fallbackHref,
  fallbackLabel,
  className,
  showOnDesktop = false,
}: MobileBackLinkProps) {
  if (href && label) {
    return (
      <BackLinkChrome
        className={className}
        href={href}
        label={label}
        showOnDesktop={showOnDesktop}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <BackLinkChrome
          className={className}
          href={fallbackHref ?? '/'}
          label={fallbackLabel ?? 'Retour'}
          showOnDesktop={showOnDesktop}
        />
      }
    >
      <DynamicBackLink
        className={className}
        fallbackHref={fallbackHref}
        fallbackLabel={fallbackLabel}
        showOnDesktop={showOnDesktop}
      />
    </Suspense>
  );
}
