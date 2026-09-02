'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useBackTarget } from '@/hooks/use-back-target';
import { ChromeGlass } from '@/components/chrome/chrome-glass';
import { cn } from '@/lib/utils';

function canUseHistoryBack(): boolean {
  if (typeof performance === 'undefined') {
    return false;
  }
  const entry = performance.getEntriesByType('navigation')[0] as
    PerformanceNavigationTiming | undefined;
  return entry?.type !== 'reload';
}

type MobileBackLinkProps = {
  href?: string;
  label?: string;
  fallbackHref?: string;
  fallbackLabel?: string;
  replace?: boolean;
  className?: string;
  showOnDesktop?: boolean;
};

function MobileGlassBack({
  className,
  href,
  label,
  onClick,
  replace,
}: {
  className?: string;
  href: string;
  label: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  replace: boolean;
}) {
  return (
    <div className="fixed top-3 left-4 z-50 lg:hidden">
      <ChromeGlass
        className="flex size-12 min-h-[44px] min-w-[44px] items-center justify-center"
        cornerRadius={999}
        style={{ left: 'auto', position: 'relative', top: 'auto' }}
      >
        <Link
          aria-label={typeof label === 'string' ? label : undefined}
          href={href}
          replace={replace}
          className={cn(
            'text-foreground/70 hover:text-foreground dark:text-foreground flex size-12 min-h-[44px] min-w-[44px] items-center justify-center rounded-full',
            className,
          )}
          onClick={onClick}
        >
          <ChevronLeft className="size-6 shrink-0" aria-hidden />
        </Link>
      </ChromeGlass>
    </div>
  );
}

function DesktopBack({
  className,
  href,
  label,
  onClick,
  replace,
  showOnDesktop,
}: {
  className?: string;
  href: string;
  label: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  replace: boolean;
  showOnDesktop: boolean;
}) {
  return (
    <Link
      aria-label={typeof label === 'string' ? label : undefined}
      href={href}
      replace={replace}
      className={cn(
        'text-muted-foreground hover:text-foreground mb-3 hidden items-center justify-start gap-1 lg:flex',
        !showOnDesktop && 'lg:hidden',
        className,
      )}
      onClick={onClick}
    >
      <ChevronLeft className="size-4 shrink-0" aria-hidden />
      <span className="text-sm">{label}</span>
    </Link>
  );
}

function BackLinkChrome({
  className,
  href,
  label,
  onClick,
  replace = false,
  showOnDesktop,
}: {
  className?: string;
  href: string;
  label: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  replace?: boolean;
  showOnDesktop: boolean;
}) {
  return (
    <>
      <MobileGlassBack
        className={className}
        href={href}
        label={label}
        replace={replace}
        onClick={onClick}
      />
      <DesktopBack
        className={className}
        href={href}
        label={label}
        replace={replace}
        showOnDesktop={showOnDesktop}
        onClick={onClick}
      />
      <div className="h-16 lg:hidden" aria-hidden />
    </>
  );
}

function DynamicBackLink({
  className,
  fallbackHref,
  fallbackLabel,
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
 * or provide a `fallbackHref` + `fallbackLabel` when the stack is empty.
 */
export function MobileBackLink({
  className,
  fallbackHref,
  fallbackLabel,
  href,
  label,
  replace = false,
  showOnDesktop = false,
}: MobileBackLinkProps) {
  if (href && label) {
    return (
      <BackLinkChrome
        className={className}
        href={href}
        label={label}
        replace={replace}
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
