'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import {
  Activity,
  CalendarRange,
  PersonStanding,
  Settings,
  Sparkles,
  Target,
  Sun,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clerkAppearance } from '@/lib/clerk-appearance';
import { navLinkClass } from '@/lib/nav-pill';

type NavItem = {
  href: string;
  label: string;
  icon: typeof Sun;
  match: (pathname: string) => boolean;
};

const mainNavItems: NavItem[] = [
  { href: '/', label: "Aujourd'hui", icon: Sun, match: (p) => p === '/' },
  {
    href: '/seances',
    label: 'Séances',
    icon: CalendarRange,
    match: (p) =>
      p.startsWith('/seances') ||
      p.startsWith('/training') ||
      p.startsWith('/calendar') ||
      p.startsWith('/planning'),
  },
  {
    href: '/corps',
    label: 'Mon corps',
    icon: PersonStanding,
    match: (p) =>
      p.startsWith('/corps') ||
      p.startsWith('/recovery') ||
      p.startsWith('/body') ||
      p.startsWith('/analytics'),
  },
  {
    href: '/goals',
    label: 'Objectifs',
    icon: Target,
    match: (p) => p.startsWith('/goals'),
  },
  {
    href: '/coach',
    label: 'Coach',
    icon: Sparkles,
    match: (p) => p.startsWith('/coach'),
  },
];

const settingsNavItem: NavItem = {
  href: '/settings',
  label: 'Réglages',
  icon: Settings,
  match: (p) => p.startsWith('/settings'),
};

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = item.match(pathname);
  const Icon = item.icon;

  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      className={navLinkClass(isActive, 'bg-sidebar')}
      href={item.href}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="border-sidebar-border bg-sidebar sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r">
      <div className="px-4 pt-6 pb-5">
        <Link
          className="hover:bg-sidebar-accent/50 flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors"
          href="/"
        >
          <div className="bg-primary/10 ring-primary/25 flex size-9 items-center justify-center rounded-xl ring-1">
            <Activity className="text-primary size-4" aria-hidden />
          </div>
          <div>
            <p className="font-heading text-sm font-semibold tracking-tight">SHARPIT</p>
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
              Intelligence sportive
            </p>
          </div>
        </Link>
      </div>

      <nav aria-label="Navigation principale" className="flex flex-1 flex-col overflow-y-auto px-3">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        <div className="border-sidebar-border mt-4 space-y-1 border-t pt-4">
          <NavLink item={settingsNavItem} pathname={pathname} />
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
