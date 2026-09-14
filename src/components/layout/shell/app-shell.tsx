'use client';

import { Suspense, type ReactNode } from 'react';
import { BottomNav } from './mobile-shell';
import { SystemEdgeBlur } from './system-edge-blur';
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
            // The document owns vertical scrolling so Safari can composite live
            // page pixels under its system edge. `clip` protects horizontal
            // overflow without creating another vertical scroll container.
            hideBottomNav ? 'pb-0' : 'pb-(--bottom-nav-offset)',
          )}
        >
          <SystemEdgeBlur enabled={!coachMobileImmersive} />
          <div
            className={cn(
              // Mobile: clear the status strip (Safari paints a solid/soft body
              // tint there at rest — titles must not start inside it). Desktop
              // keeps the regular page gutter via lg:p-6.
              'safe-page-top mx-auto px-4 pb-4 [--page-gutter:1rem] lg:p-6 lg:[--page-gutter:1.5rem]',
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

/**
 * Pathname + viewport decide Coach immersive chrome (hide floating tab bar on mobile).
 * Must live under Suspense for Cache Components prerender.
 */
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
 *
 * `--page-gutter` must stay in sync with `PAGE_GUTTER` in `src/lib/ui/page-gutter.ts`
 * (1rem mobile / 1.5rem desktop).
 *
 * Coach on mobile: hide the floating tab bar to reclaim vertical space.
 * Desktop keeps the tab bar.
 */
export function AppShell({
  children,
  demoBanner,
}: {
  children: React.ReactNode;
  /** Server-rendered slot (AppShell is a Client Component and can't await cookies() itself). */
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
