'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity } from 'lucide-react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { AthleteNavAvatar, AthleteNavAvatarSkeleton } from '@/components/layout/athlete-nav-avatar';
import { profileNavItem, sidebarPrimaryNavItems, type AppNavItem } from '@/lib/app-navigation';
import { useAthleteNavIdentity } from '@/hooks/use-athlete-nav-identity';
import { usePrefetchNavQuery } from '@/hooks/use-prefetch-nav';
import { springs } from '@/lib/motion/tokens';
import { cn } from '@/lib/utils';

function NavLink({
  item,
  pathname,
  onPrefetch,
}: {
  item: AppNavItem;
  /** `null` while the URL is still unknown — renders the link without a highlight. */
  pathname: string | null;
  onPrefetch: (href: string) => void;
}) {
  const isActive = pathname !== null && item.match(pathname);
  const Icon = item.icon;
  const reduce = useReducedMotion();

  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      href={item.href}
      className={cn(
        'group pressable focus-visible:ring-sidebar-ring rounded-analysis relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-hidden',
        isActive
          ? 'text-highlight-foreground'
          : 'text-muted-foreground hover:bg-highlight/40 hover:text-foreground',
      )}
      onMouseEnter={() => onPrefetch(item.href)}
    >
      {isActive && !reduce ? (
        <motion.span
          className="bg-highlight rounded-analysis absolute inset-0"
          layoutId="sidebar-nav-active"
          transition={springs.snappy}
          aria-hidden
        />
      ) : null}
      {isActive && reduce ? (
        <span className="bg-highlight rounded-analysis absolute inset-0" aria-hidden />
      ) : null}
      <Icon className="relative size-4 shrink-0" aria-hidden />
      <span className="relative">{item.label}</span>
    </Link>
  );
}

function ActiveNavLink({
  item,
  onPrefetch,
}: {
  item: AppNavItem;
  onPrefetch: (href: string) => void;
}) {
  const pathname = usePathname();
  return <NavLink item={item} pathname={pathname} onPrefetch={onPrefetch} />;
}

/**
 * The nav itself is static and belongs in the prerendered shell; only the
 * active highlight needs the URL. The fallback is the very same link without
 * the highlight, so the boundary costs nothing visually — the highlight snaps
 * in once the route is known.
 */
function SidebarNavLink({
  item,
  onPrefetch,
}: {
  item: AppNavItem;
  onPrefetch: (href: string) => void;
}) {
  return (
    <Suspense fallback={<NavLink item={item} pathname={null} onPrefetch={onPrefetch} />}>
      <ActiveNavLink item={item} onPrefetch={onPrefetch} />
    </Suspense>
  );
}

function NavActiveBackdrop({
  isActive,
  reduce,
  className,
}: {
  isActive: boolean;
  reduce: boolean | null;
  className: string;
}) {
  if (!isActive) {
    return null;
  }
  if (!reduce) {
    return (
      <motion.span
        className={className}
        layoutId="sidebar-nav-active"
        transition={springs.snappy}
        aria-hidden
      />
    );
  }
  return <span className={className} aria-hidden />;
}

function AthleteIdentityAvatar({
  identity,
  isActive,
}: {
  identity: ReturnType<typeof useAthleteNavIdentity>;
  isActive: boolean;
}) {
  if (identity.isReady) {
    return (
      <AthleteNavAvatar
        initials={identity.initials}
        size="md"
        className={cn(
          'relative',
          isActive && 'bg-highlight-foreground/15 text-highlight-foreground',
        )}
      />
    );
  }
  return <AthleteNavAvatarSkeleton className="relative" size="md" />;
}

function AthleteIdentityLink({ onPrefetch }: { onPrefetch: (href: string) => void }) {
  const pathname = usePathname();
  const identity = useAthleteNavIdentity();
  const isActive = pathname !== null && profileNavItem.match(pathname);
  const reduce = useReducedMotion();

  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      aria-label={identity.fullLabel}
      href={profileNavItem.href}
      className={cn(
        'group pressable-lg focus-visible:ring-sidebar-ring rounded-analysis-lg relative flex items-center gap-3 p-2.5 text-left focus-visible:ring-2 focus-visible:outline-hidden',
        isActive ? 'text-highlight-foreground' : 'text-foreground hover:bg-highlight/40',
        'analysis-panel hover:border-primary/20',
      )}
      onMouseEnter={() => onPrefetch(profileNavItem.href)}
    >
      <NavActiveBackdrop
        className="bg-highlight rounded-analysis-lg absolute inset-0"
        isActive={isActive}
        reduce={reduce}
      />
      <AthleteIdentityAvatar identity={identity} isActive={isActive} />
      <span className="relative min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{identity.shortLabel}</span>
        {identity.email ? (
          <span className="text-muted-foreground block truncate text-xs">{identity.email}</span>
        ) : null}
      </span>
    </Link>
  );
}

function SuspendedAthleteIdentityLink({ onPrefetch }: { onPrefetch: (href: string) => void }) {
  return (
    <Suspense
      fallback={
        <div className="analysis-panel rounded-analysis-lg flex items-center gap-3 p-2.5">
          <AthleteNavAvatarSkeleton size="md" />
          <span className="bg-muted/60 h-4 w-24 animate-pulse rounded-full" aria-hidden />
        </div>
      }
    >
      <AthleteIdentityLink onPrefetch={onPrefetch} />
    </Suspense>
  );
}

export function Sidebar() {
  const prefetch = usePrefetchNavQuery();

  return (
    <aside className="border-sidebar-border bg-sidebar text-sidebar-foreground sticky top-0 flex h-dvh w-60 shrink-0 flex-col border-r">
      <div className="px-3 pt-5 pb-4">
        <Link
          className="hover:bg-highlight/30 focus-visible:ring-sidebar-ring rounded-analysis flex items-center gap-3 px-2 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
          href="/"
        >
          <div className="icon-well size-9">
            <Activity className="size-4" aria-hidden />
          </div>
          <p className="font-heading text-sm font-semibold tracking-tight">SHARPIT</p>
        </Link>
      </div>

      <LayoutGroup id="sidebar-nav">
        <nav
          aria-label="Navigation principale"
          className="flex flex-1 flex-col overflow-y-auto px-3"
        >
          <div className="space-y-1">
            {sidebarPrimaryNavItems.map((item) => (
              <SidebarNavLink key={item.href} item={item} onPrefetch={prefetch} />
            ))}
          </div>
        </nav>

        <div className="border-sidebar-border border-t px-3 pt-3 pb-3">
          <SuspendedAthleteIdentityLink onPrefetch={prefetch} />
        </div>
      </LayoutGroup>
    </aside>
  );
}
