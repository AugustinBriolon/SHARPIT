'use client';

import { Suspense, type CSSProperties, type ReactNode } from 'react';
import { BottomNav } from './mobile-shell';
import { OfflineBanner } from '@/components/pwa/offline-banner';
import { SyncingIndicator } from '@/components/ui/syncing-indicator';
import { PAGE_CONTENT_MAX_CLASS } from '@/lib/ui/page-gutter';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-viewport';

function isCoachPath(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }
  return pathname === '/coach' || pathname.startsWith('/coach/');
}

type AppShellFrameProps = {
  children: ReactNode;
  demoBanner?: ReactNode;
  hideBottomNav: boolean;
  coachMobileImmersive: boolean;
};

/**
 * Top inset that clears Safari Liquid Glass / status overlap.
 * Inline style — cannot be dropped by a missing Tailwind utility or stale chunk.
 * Floor 3.5rem: Safari tabs often report safe-area-inset-top as 0 while UI still
 * overlaps ~50px. Standalone insets (~47–59px) still win via max().
 */
const SAFE_PAGE_TOP_STYLE: CSSProperties = {
  paddingTop: 'max(3.5rem, env(safe-area-inset-top, 0px))',
};

function AppShellSkipLink() {
  return (
    <a
      className="bg-background text-foreground focus-visible:ring-ring focus:safe-top-offset sr-only focus:not-sr-only focus:absolute focus:left-3 focus:z-100 focus:rounded-lg focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus-visible:ring-3 focus-visible:outline-none"
      href="#main-content"
    >
      Aller au contenu
    </a>
  );
}

/**
 * Presentational chrome — no URL hooks, so it can prerender as a Suspense fallback.
 */
function AppShellFrame({
  children,
  demoBanner,
  hideBottomNav,
  coachMobileImmersive,
}: AppShellFrameProps) {
  return (
    <div className="bg-background flex min-h-dvh flex-col overflow-x-clip">
      <AppShellSkipLink />

      <div className="flex min-w-0 flex-1 flex-col">
        {demoBanner}
        <OfflineBanner />
        <SyncingIndicator className="border-border/40 safe-top-offset fixed left-0 z-50 w-full border-b" />

        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'min-w-0 flex-1 overflow-x-clip',
            hideBottomNav ? 'pb-0' : 'pb-(--bottom-nav-offset)',
          )}
        >
          <div
            data-safe-page-top=""
            style={coachMobileImmersive ? undefined : SAFE_PAGE_TOP_STYLE}
            className={cn(
              'mx-auto px-4 pb-4 [--page-gutter:1rem] lg:p-6 lg:pt-6 lg:[--page-gutter:1.5rem]',
              PAGE_CONTENT_MAX_CLASS,
              coachMobileImmersive && 'max-w-none p-0',
            )}
          >
            {children}
          </div>
        </main>

        {hideBottomNav ? null : <BottomNav />}
      </div>
    </div>
  );
}

function AppShellPathAware({
  children,
  demoBanner,
}: {
  children: ReactNode;
  demoBanner?: ReactNode;
}) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const coachMobileImmersive = isCoachPath(pathname) && isMobile;

  return (
    <AppShellFrame
      coachMobileImmersive={coachMobileImmersive}
      demoBanner={demoBanner}
      hideBottomNav={coachMobileImmersive}
    >
      {children}
    </AppShellFrame>
  );
}

/**
 * Single page tree for every viewport — one floating bottom tab bar, one
 * centered reading column. Do not mount `{children}` in two shells — that
 * doubles page instances and makes warm React Query navigations look like
 * cold reloads on PWA.
 */
export function AppShell({
  children,
  demoBanner,
}: {
  children: React.ReactNode;
  demoBanner?: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <AppShellFrame coachMobileImmersive={false} demoBanner={demoBanner} hideBottomNav={false}>
          {children}
        </AppShellFrame>
      }
    >
      <AppShellPathAware demoBanner={demoBanner}>{children}</AppShellPathAware>
    </Suspense>
  );
}
