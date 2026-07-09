'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { bottomNavItems, type AppNavItem } from '@/lib/app-navigation';
import { usePrefetchNavQuery } from '@/hooks/use-prefetch-nav';
import { cn } from '@/lib/utils';
import { OfflineBanner } from '@/components/pwa/offline-banner';

function BottomNavLink({
  item,
  pathname,
  onNavigate,
  onPrefetch,
}: {
  item: AppNavItem;
  pathname: string;
  onNavigate?: () => void;
  onPrefetch: (href: string) => void;
}) {
  const isActive = item.match(pathname);
  const Icon = item.icon;
  const hint = () => onPrefetch(item.href);

  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      href={item.href}
      className={cn(
        'flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-medium transition-colors',
        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
      onClick={onNavigate}
      onMouseEnter={hint}
      onTouchStart={hint}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const prefetch = usePrefetchNavQuery();

  return (
    <nav
      aria-label="Navigation principale"
      className="border-border/60 bg-background/95 supports-backdrop-filter:bg-background/80 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around p-2">
        {bottomNavItems.map((item) => (
          <BottomNavLink key={item.href} item={item} pathname={pathname} onPrefetch={prefetch} />
        ))}
      </div>
    </nav>
  );
}

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex h-dvh flex-col lg:hidden">
      <OfflineBanner />
      <main
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain"
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
