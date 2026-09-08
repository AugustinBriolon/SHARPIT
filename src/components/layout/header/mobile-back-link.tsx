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
  /** @deprecated Chrome is unified — the glass back control is always shown. */
  showOnDesktop?: boolean;
};

function GlassBack({
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
    <div className="fixed top-3 left-[max(1rem,env(safe-area-inset-left))] z-50 lg:static lg:inset-auto lg:top-auto lg:left-auto lg:z-auto">
      <ChromeGlass
        className="flex size-12 min-h-[44px] min-w-[44px] items-center justify-center lg:size-auto lg:min-h-0 lg:min-w-0 lg:border-0 lg:bg-transparent lg:shadow-none lg:backdrop-blur-none"
        cornerRadius={999}
        style={{ left: 'auto', position: 'relative', top: 'auto' }}
      >
        <Link
          aria-label={typeof label === 'string' ? label : undefined}
          href={href}
          replace={replace}
          className={cn(
            'text-foreground/70 hover:text-foreground dark:text-foreground flex size-12 min-h-[44px] min-w-[44px] items-center justify-center rounded-full',
            'lg:-ml-1.5 lg:size-9 lg:min-h-9 lg:min-w-9 lg:justify-center lg:rounded-md lg:px-0',
            className,
          )}
          onClick={onClick}
        >
          <ChevronLeft className="size-6 shrink-0 lg:size-5" aria-hidden />
        </Link>
      </ChromeGlass>
    </div>
  );
}

function BackLinkChrome({
  className,
  href,
  label,
  onClick,
  replace = false,
}: {
  className?: string;
  href: string;
  label: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  replace?: boolean;
}) {
  return (
    <>
      <GlassBack
        className={className}
        href={href}
        label={label}
        replace={replace}
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
}: Omit<MobileBackLinkProps, 'href' | 'label' | 'showOnDesktop'>) {
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
}: MobileBackLinkProps) {
  if (href && label) {
    return <BackLinkChrome className={className} href={href} label={label} replace={replace} />;
  }

  return (
    <Suspense
      fallback={
        <BackLinkChrome
          className={className}
          href={fallbackHref ?? '/'}
          label={fallbackLabel ?? 'Retour'}
        />
      }
    >
      <DynamicBackLink
        className={className}
        fallbackHref={fallbackHref}
        fallbackLabel={fallbackLabel}
      />
    </Suspense>
  );
}
