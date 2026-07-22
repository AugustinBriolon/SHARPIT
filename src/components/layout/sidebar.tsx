'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import { Activity } from 'lucide-react';
import { settingsNavItem, sidebarPrimaryNavItems, type AppNavItem } from '@/lib/app-navigation';
import { usePrefetchNavQuery } from '@/hooks/use-prefetch-nav';
import { navLinkClass } from '@/lib/ui/nav-pill';
import { cn } from '@/lib/utils';

function NavLink({
  item,
  pathname,
  onPrefetch,
}: {
  item: AppNavItem;
  pathname: string;
  onPrefetch: (href: string) => void;
}) {
  const isActive = item.match(pathname);
  const Icon = item.icon;

  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      className={navLinkClass(isActive)}
      href={item.href}
      onMouseEnter={() => onPrefetch(item.href)}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{item.label}</span>
    </Link>
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
  const pathname = usePathname();
  const prefetch = usePrefetchNavQuery();

  return (
    <aside className="border-sidebar-border bg-sidebar text-sidebar-foreground sticky top-0 flex h-dvh w-60 shrink-0 flex-col border-r">
      <div className="px-3 pt-5 pb-4">
        <Link
          className="hover:bg-highlight/30 focus-visible:ring-sidebar-ring rounded-analysis flex items-center gap-3 px-2 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
          href="/"
        >
          <div className="icon-well rounded-analysis-lg size-9">
            <Activity className="size-4" aria-hidden />
          </div>
          <p className="font-heading text-sm font-semibold tracking-tight">SHARPIT</p>
        </Link>
      </div>

      <nav aria-label="Navigation principale" className="flex flex-1 flex-col overflow-y-auto px-3">
        <div className="space-y-1">
          {sidebarPrimaryNavItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onPrefetch={prefetch} />
          ))}
        </div>
      </nav>

      <div className="border-sidebar-border space-y-2 border-t px-3 pt-3 pb-3">
        <NavLink item={settingsNavItem} pathname={pathname} onPrefetch={prefetch} />
        <AccountMenu />
      </div>
    </aside>
  );
}
