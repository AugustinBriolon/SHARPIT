'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { navStack } from '@/lib/navigation/nav-stack';
import { resolveRouteLabel } from '@/lib/navigation/route-registry';
import { emitNavStackChanged } from '@/hooks/use-back-target';

/**
 * Mount once at the app-shell level. Each route change pushes an entry
 * (or collapses onto the top if identical) so MobileBackLink can reason
 * about the athlete's actual path — not the browser's history.
 *
 * Nothing to render; this is a side-effect only component.
 */
export function NavStackTracker(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const search = searchParams?.toString() ?? '';
    const href = search ? `${pathname}?${search}` : pathname;
    const label = resolveRouteLabel(href);
    navStack.push({ href, label, ts: Date.now() });
    emitNavStackChanged();
  }, [pathname, searchParams]);

  return null;
}
