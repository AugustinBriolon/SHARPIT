'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { AthleteNavAvatar, AthleteNavAvatarSkeleton } from '@/components/layout/athlete-nav-avatar';
import { bottomNavItems, profileNavItem, type AppNavItem } from '@/lib/app-navigation';
import { useAthleteNavIdentity } from '@/hooks/use-athlete-nav-identity';
import { usePrefetchNavQuery } from '@/hooks/use-prefetch-nav';
import { PAGE_CONTENT_MAX_CLASS, PAGE_GUTTER } from '@/lib/ui/page-gutter';
import { springs } from '@/lib/motion/tokens';
import { cn } from '@/lib/utils';
import { OfflineBanner } from '@/components/pwa/offline-banner';
import { SyncingIndicator } from '@/components/ui/syncing-indicator';
import { ChromeGlass } from '@/components/chrome/chrome-glass';
import { haptic } from '@/lib/haptic';

function bottomNavGlyph(options: {
  item: AppNavItem;
  isAthleteTab: boolean;
  identity: ReturnType<typeof useAthleteNavIdentity>;
  isActive: boolean;
}) {
  const { item, isAthleteTab, identity, isActive } = options;
  const Icon = item.icon;
  if (!isAthleteTab) {
    return <Icon className="relative size-5 shrink-0" aria-hidden />;
  }
  // Demo (and similar): standard CircleUser — banner already signals demo.
  if (identity.preferStandardIcon) {
    return <Icon className="relative size-5 shrink-0" aria-hidden />;
  }
  if (identity.isReady) {
    return (
      <AthleteNavAvatar
        initials={identity.initials}
        size="sm"
        className={cn(
          'relative',
          isActive && 'bg-highlight-foreground/15 text-highlight-foreground',
        )}
      />
    );
  }
  return <AthleteNavAvatarSkeleton className="relative" size="sm" />;
}

function BottomNavActiveHighlight({
  isActive,
  reduce,
}: {
  isActive: boolean;
  reduce: boolean | null;
}) {
  if (!isActive) {
    return null;
  }
  if (reduce) {
    return <span className="bg-highlight absolute inset-0 rounded-2xl" aria-hidden />;
  }
  return (
    <motion.span
      className="bg-highlight absolute inset-0 rounded-2xl"
      layoutId="bottom-nav-active"
      transition={springs.snappy}
      aria-hidden
    />
  );
}

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
  const isActive = pathname !== null && item.match(pathname);
  const reduce = useReducedMotion();
  const hint = () => onPrefetch(item.href);
  const isAthleteTab = item.href === profileNavItem.href;
  const identity = useAthleteNavIdentity();
  const label = isAthleteTab ? identity.shortLabel : item.label;
  const glyph = bottomNavGlyph({ item, isAthleteTab, identity, isActive });

  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      aria-label={isAthleteTab ? identity.fullLabel : undefined}
      href={item.href}
      className={cn(
        'pressable relative flex h-12 w-17 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-medium md:w-20',
        isActive ? 'text-highlight-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
      onMouseEnter={hint}
      onTouchStart={hint}
      onClick={() => {
        if (!isActive) {
          haptic('tap');
        }
        onNavigate?.();
      }}
    >
      <BottomNavActiveHighlight isActive={isActive} reduce={reduce} />
      {glyph}
      <span className="relative max-w-full truncate">{label}</span>
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
 * Same shape as the old sidebar: the bar is static and prerenders, only the
 * active highlight waits on the URL. The fallback is the identical link minus
 * the highlight, so nothing moves when the boundary resolves.
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

/** Primary chrome on every viewport — floating iOS-style capsule, not mobile-only. */
export function BottomNav() {
  const prefetch = usePrefetchNavQuery();

  return (
    <nav
      aria-label="Navigation principale"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-2"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <ChromeGlass
        className="pointer-events-auto relative top-auto left-auto mx-auto w-fit rounded-2xl!"
        cornerRadius={20}
        forceFallback
      >
        <LayoutGroup id="bottom-nav">
          <div className="flex items-center justify-around gap-0.5 p-0.5">
            {bottomNavItems.map((item) => (
              <SuspendedBottomNavLink key={item.href} item={item} onPrefetch={prefetch} />
            ))}
          </div>
        </LayoutGroup>
      </ChromeGlass>
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
        style={{ paddingBottom: 'var(--bottom-nav-offset)' }}
      >
        <div
          className={cn('mx-auto px-4 py-4', PAGE_CONTENT_MAX_CLASS)}
          style={{ ['--page-gutter' as string]: PAGE_GUTTER.mobile }}
        >
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
