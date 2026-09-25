'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** True when `pathname` is one of `prefixes` or below it. */
export function isGateExempt(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * The redirect a layout gate decides on the server, carried out by the client.
 *
 * A server `redirect()` inside a `<Suspense>` boundary that already streamed makes the
 * server abort the render — React then logs errors #419 and #441 in the console even
 * though the navigation happens. Here the gate renders a cover and navigates once
 * mounted, so nothing aborts; `exempt` pages (a flow the gate itself sends the athlete
 * through) are left alone, re-checked on every client navigation.
 */
export function GateRedirect({ href, exempt = [] }: { href: string; exempt?: readonly string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const skip = isGateExempt(pathname, exempt);

  useEffect(() => {
    if (!skip) {
      router.replace(href);
    }
  }, [href, router, skip]);

  if (skip) {
    return null;
  }
  return <div className="bg-background fixed inset-0 z-50" aria-busy aria-hidden />;
}
