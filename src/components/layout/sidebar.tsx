'use client';

import { Suspense, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import { Activity } from 'lucide-react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { settingsNavItem, sidebarPrimaryNavItems, type AppNavItem } from '@/lib/app-navigation';
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
  const isActive = pathname != null && item.match(pathname);
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

function AccountMenu() {
  const { user } = useUser();
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const displayName = user?.fullName ?? user?.firstName ?? 'Mon compte';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';

  function openClerkMenu() {
    triggerWrapRef.current?.querySelector('button')?.click();
  }

  return (
    <div
      className={cn(
        'analysis-panel rounded-analysis-lg flex items-center gap-3 p-2.5',
        'hover:border-primary/20 hover:bg-analysis-surface-alt/80 transition-colors',
      )}
    >
      <div ref={triggerWrapRef} className="shrink-0">
        <UserButton
          appearance={{
            elements: {
              rootBox: 'flex',
              userButtonTrigger:
                'rounded-full focus:shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              avatarBox: 'size-8 ring-1 ring-border',
            },
          }}
        />
      </div>
      <button
        aria-label={`Ouvrir le menu compte · ${displayName}`}
        className="focus-visible:ring-sidebar-ring min-w-0 flex-1 rounded-md text-left focus-visible:ring-2 focus-visible:outline-hidden"
        type="button"
        onClick={openClerkMenu}
      >
        <p className="truncate text-sm font-medium">{displayName}</p>
        {email ? <p className="text-muted-foreground truncate text-xs">{email}</p> : null}
      </button>
    </div>
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

        <div className="border-sidebar-border space-y-2 border-t px-3 pt-3 pb-3">
          <SidebarNavLink item={settingsNavItem} onPrefetch={prefetch} />
          <AccountMenu />
        </div>
      </LayoutGroup>
    </aside>
  );
}
