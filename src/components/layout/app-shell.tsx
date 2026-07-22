'use client';

import { BottomNav } from './mobile-shell';
import { Sidebar } from './sidebar';
import { OfflineBanner } from '@/components/pwa/offline-banner';
import { SyncingIndicator } from '@/components/ui/syncing-indicator';
import { cn } from '@/lib/utils';

/**
 * Single page tree for mobile + desktop chrome.
 * Do not mount `{children}` in two shells — that doubles page instances and
 * makes warm React Query navigations look like cold reloads on PWA.
 *
 * `--page-gutter` must stay in sync with `PAGE_GUTTER` in `src/lib/page-gutter.ts`
 * (1rem mobile / 1.5rem desktop).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex h-dvh flex-col overflow-hidden lg:flex-row">
      <div className="hidden h-full shrink-0 lg:flex">
        <Sidebar />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <SyncingIndicator className="border-border/40 border-b lg:fixed lg:top-0 lg:right-0 lg:w-[calc(100%-239px)]" />

        <main
          className={cn(
            'min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain',
            'max-lg:pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]',
          )}
        >
          <div className="mx-auto max-w-lg px-4 py-4 [--page-gutter:1rem] lg:max-w-none lg:p-6 lg:[--page-gutter:1.5rem]">
            {children}
          </div>
        </main>

        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
