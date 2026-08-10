'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { bottomNavItems, type AppNavItem } from '@/lib/app-navigation';
import { usePrefetchNavQuery } from '@/hooks/use-prefetch-nav';
import { PAGE_GUTTER } from '@/lib/ui/page-gutter';
import { springs } from '@/lib/motion/tokens';
import { cn } from '@/lib/utils';
import { OfflineBanner } from '@/components/pwa/offline-banner';
import { SyncingIndicator } from '@/components/ui/syncing-indicator';
import { haptic } from '@/lib/haptic';

function BottomNavLink({
  item,
  pathname,
  onNavigate,
  onPrefetch,
}: {
  item: AppNavItem;
  /** `null` while the URL is still unknown — renders the link without a highlight. */
  pathname: string | null;
  onNavigate?: () => void;
  onPrefetch: (href: string) => void;
}) {
  const isActive = pathname != null && item.match(pathname);
  const Icon = item.icon;
  const reduce = useReducedMotion();
  const hint = () => onPrefetch(item.href);

  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      href={item.href}
      className={cn(
        'pressable relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-medium',
        isActive ? 'text-highlight-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
      onMouseEnter={hint}
      onTouchStart={hint}
      onClick={() => {
        if (!isActive) haptic('tap');
        onNavigate?.();
      }}
    >
      {isActive && !reduce ? (
        <motion.span
          className="bg-highlight absolute inset-0 rounded-2xl"
          layoutId="bottom-nav-active"
          transition={springs.snappy}
          aria-hidden
        />
      ) : null}
      {isActive && reduce ? (
        <span className="bg-highlight absolute inset-0 rounded-2xl" aria-hidden />
      ) : null}
      <Icon className="relative size-5 shrink-0" aria-hidden />
      <span className="relative truncate">{item.label}</span>
    </Link>
  );
}

function ActiveBottomNavLink({
  item,
  onPrefetch,
}: {
  item: AppNavItem;
  onPrefetch: (href: string) => void;
}) {
  const pathname = usePathname();
  return <BottomNavLink item={item} pathname={pathname} onPrefetch={onPrefetch} />;
}

/**
 * Same shape as the sidebar: the bar is static and prerenders, only the active
 * highlight waits on the URL. The fallback is the identical link minus the
 * highlight, so nothing moves when the boundary resolves.
 */
function SuspendedBottomNavLink({
  item,
  onPrefetch,
}: {
  item: AppNavItem;
  onPrefetch: (href: string) => void;
}) {
  return (
    <Suspense fallback={<BottomNavLink item={item} pathname={null} onPrefetch={onPrefetch} />}>
      <ActiveBottomNavLink item={item} onPrefetch={onPrefetch} />
    </Suspense>
  );
}

export function BottomNav() {
  const prefetch = usePrefetchNavQuery();

  return (
    <nav
      aria-label="Navigation principale"
      className="border-border/60 bg-background/95 supports-backdrop-filter:bg-background/80 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <LayoutGroup id="bottom-nav">
        <div className="mx-auto flex max-w-lg items-stretch justify-around p-2">
          {bottomNavItems.map((item) => (
            <SuspendedBottomNavLink key={item.href} item={item} onPrefetch={prefetch} />
          ))}
        </div>
      </LayoutGroup>
    </nav>
  );
}

export function MobileShell({ children }: { children: React.ReactNode }) {
  /** @deprecated Prefer `AppShell` — kept for isolated stories/tests. */
  return (
    <div className="bg-background flex h-dvh flex-col lg:hidden">
      <OfflineBanner />
      <SyncingIndicator className="border-border/40 border-b" />
      <main
        className="no-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain"
        style={{
          paddingBottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div
          className="mx-auto max-w-lg px-4 py-4"
          style={{ ['--page-gutter' as string]: PAGE_GUTTER.mobile }}
        >
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
