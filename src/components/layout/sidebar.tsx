'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import { Activity } from 'lucide-react';
import { sidebarNavItems, profileNavItem, settingsNavItem } from '@/lib/app-navigation';
import { usePrefetchNavQuery } from '@/hooks/use-prefetch-nav';
import { navLinkClass } from '@/lib/nav-pill';
import { clerkAppearance } from '@/lib/clerk-appearance';
import type { AppNavItem } from '@/lib/app-navigation';

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
      className={navLinkClass(isActive, 'bg-sidebar')}
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
    <aside className="border-sidebar-border bg-sidebar sticky top-0 flex h-dvh w-60 shrink-0 flex-col border-r">
      <div className="px-4 pt-6 pb-5">
        <Link
          className="hover:bg-sidebar-accent/50 flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors"
          href="/"
        >
          <div className="bg-primary/10 ring-primary/25 flex size-9 items-center justify-center rounded-lg ring-1">
            <Activity className="text-primary size-4" aria-hidden />
          </div>
          <div>
            <p className="font-heading text-sm font-semibold tracking-tight">SHARPIT</p>
          </div>
        </Link>
      </div>

      <nav aria-label="Navigation principale" className="flex flex-1 flex-col overflow-y-auto px-3">
        <div className="space-y-1">
          {sidebarNavItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onPrefetch={prefetch} />
          ))}
        </div>

        <div className="border-sidebar-border mt-4 space-y-1 border-t pt-4">
          <NavLink item={profileNavItem} pathname={pathname} onPrefetch={prefetch} />
          <NavLink item={settingsNavItem} pathname={pathname} onPrefetch={prefetch} />
        </div>
      </nav>

      <div className="border-sidebar-border border-t p-3">
        <div className="border-border/60 bg-card/40 flex items-center gap-3 rounded-2xl border p-3">
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
