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
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: "Aujourd'hui", icon: Sun, match: (p: string) => p === '/' },
  {
    href: '/seances',
    label: 'Séances',
    icon: CalendarRange,
    match: (p: string) =>
      p.startsWith('/seances') ||
      p.startsWith('/training') ||
      p.startsWith('/calendar') ||
      p.startsWith('/planning'),
  },
  {
    href: '/corps',
    label: 'Mon corps',
    icon: PersonStanding,
    match: (p: string) =>
      p.startsWith('/corps') ||
      p.startsWith('/recovery') ||
      p.startsWith('/body') ||
      p.startsWith('/analytics'),
  },
  {
    href: '/goals',
    label: 'Objectifs',
    icon: Target,
    match: (p: string) => p.startsWith('/goals'),
  },
  {
    href: '/coach',
    label: 'Coach',
    icon: Sparkles,
    match: (p: string) => p.startsWith('/coach'),
  },
  {
    href: '/settings',
    label: 'Réglages',
    icon: Settings,
    match: (p: string) => p.startsWith('/settings'),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="border-border bg-sidebar sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r">
      <div className="border-border/60 border-b px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 ring-primary/30 flex size-9 items-center justify-center rounded-lg ring-1">
            <Activity className="text-primary size-4" />
          </div>
          <div>
            <p className="font-heading text-sm font-semibold tracking-wide">SharpIt</p>
            <p className="text-muted-foreground text-xs">Training intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive = item.match(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-border/60 border-t px-4 py-4">
        <div className="flex items-center gap-3">
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
