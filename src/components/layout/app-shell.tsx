'use client';

import { BottomNav } from './mobile-shell';
import { OfflineBanner } from '@/components/pwa/offline-banner';
import { SyncingIndicator } from '@/components/ui/syncing-indicator';
import { PAGE_CONTENT_MAX_CLASS } from '@/lib/ui/page-gutter';
import { cn } from '@/lib/utils';

/**
 * Single page tree for every viewport — one floating bottom tab bar, one
 * centered reading column. Do not mount `{children}` in two shells — that
 * doubles page instances and makes warm React Query navigations look like
 * cold reloads on PWA.
 *
 * `--page-gutter` must stay in sync with `PAGE_GUTTER` in `src/lib/ui/page-gutter.ts`
 * (1rem mobile / 1.5rem desktop).
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
    <div className="bg-background flex h-dvh flex-col overflow-hidden">
      <a
        className="bg-background text-foreground focus-visible:ring-ring sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100 focus:rounded-lg focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus-visible:ring-3 focus-visible:outline-none"
        href="#main-content"
      >
        Aller au contenu
      </a>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {demoBanner}
        <OfflineBanner />
        <SyncingIndicator className="border-border/40 fixed top-0 left-0 z-50 w-full border-b" />

        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain',
            'no-scrollbar pb-(--bottom-nav-offset)',
          )}
        >
          <div
            className={cn(
              'mx-auto px-4 py-4 [--page-gutter:1rem] lg:p-6 lg:[--page-gutter:1.5rem]',
              PAGE_CONTENT_MAX_CLASS,
            )}
          >
            {children}
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
