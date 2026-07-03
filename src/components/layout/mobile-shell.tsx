'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import {
  bottomNavItems,
  isMoreNavActive,
  moreNavItems,
  moreNavTrigger,
  type AppNavItem,
} from '@/lib/app-navigation';
import { navLinkClass } from '@/lib/nav-pill';
import { cn } from '@/lib/utils';
import { clerkAppearance } from '@/lib/clerk-appearance';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { OfflineBanner } from '@/components/pwa/offline-banner';

function BottomNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: AppNavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive = item.match(pathname);
  const Icon = item.icon;

  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      href={item.href}
      className={cn(
        'flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors',
        isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
      onClick={onNavigate}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function MoreNavSheet({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const moreActive = isMoreNavActive(pathname);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Plus d'options"
        className={cn(
          'flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors',
          moreActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <moreNavTrigger.icon className="size-5 shrink-0" aria-hidden />
        <span>{moreNavTrigger.label}</span>
      </SheetTrigger>
      <SheetContent className="pb-[calc(1rem+env(safe-area-inset-bottom))]" side="bottom">
        <SheetHeader>
          <SheetTitle>Plus</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-1">
          {moreNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.match(pathname);
            return (
              <Link
                key={item.href}
                className={navLinkClass(isActive, 'bg-background')}
                href={item.href}
                onClick={() => setOpen(false)}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="border-border/60 mt-6 flex items-center gap-3 rounded-2xl border p-3">
          <UserButton
            appearance={{
              ...clerkAppearance,
              elements: {
                ...clerkAppearance.elements,
                avatarBox: 'size-9 ring-1 ring-border',
              },
            }}
          />
          <p className="text-muted-foreground text-xs">Compte et déconnexion</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="border-border/60 bg-background/95 supports-backdrop-filter:bg-background/80 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {bottomNavItems.map((item) => (
          <BottomNavLink key={item.href} item={item} pathname={pathname} />
        ))}
        <MoreNavSheet pathname={pathname} />
      </div>
    </nav>
  );
}

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-dvh flex-col lg:hidden">
      <OfflineBanner />
      <main
        className="flex-1 overflow-y-auto overscroll-y-contain"
        style={{
          paddingBottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="mx-auto max-w-lg px-4 py-4">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
