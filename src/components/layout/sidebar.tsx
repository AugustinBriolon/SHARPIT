'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import { Activity } from 'lucide-react';
import { settingsNavItem, sidebarPrimaryNavItems, type AppNavItem } from '@/lib/app-navigation';
import { usePrefetchNavQuery } from '@/hooks/use-prefetch-nav';
import { navLinkClass } from '@/lib/nav-pill';
import { clerkAppearance } from '@/lib/clerk-appearance';

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

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
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

        <div className="analysis-panel rounded-analysis-lg flex items-center gap-3 p-2.5">
          <UserButton
            appearance={{
              ...clerkAppearance,
              elements: {
                ...clerkAppearance.elements,
                avatarBox: 'size-8 ring-1 ring-border',
              },
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {user?.fullName ?? user?.firstName ?? 'Mon compte'}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {user?.primaryEmailAddress?.emailAddress ?? ''}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
