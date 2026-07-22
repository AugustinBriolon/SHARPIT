'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { navStack } from '@/lib/navigation/nav-stack';
import { resolveRouteFallback } from '@/lib/navigation/route-registry';

export type BackTarget = { href: string; label: string };

/**
 * Subscribe to storage changes emitted by the tracker so back-buttons rerender
 * as soon as a new entry is pushed.
 *
 * We use a bespoke event (`sharpit:nav-stack-changed`) dispatched by the tracker
 * because the native `storage` event only fires cross-tab, not within the same tab.
 */
const NAV_STACK_EVENT = 'sharpit:nav-stack-changed';

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(NAV_STACK_EVENT, callback);
  return () => window.removeEventListener(NAV_STACK_EVENT, callback);
}

function getSnapshot(): number {
  // Snapshot only needs to change when the stack changes; length is a cheap proxy.
  // We also fold in the peek href to catch replaceTop (same length, new content).
  const entries = navStack.all();
  const top = entries[entries.length - 1];
  return entries.length * 31 + (top ? hashString(top.href) : 0);
}

function getServerSnapshot(): number {
  return 0;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/**
 * Notify subscribers that the stack changed. Called by the tracker after each push.
 */
export function emitNavStackChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(NAV_STACK_EVENT));
}

/**
 * Resolve where Back should send the athlete right now.
 *
 * 1. Previous entry on the app-managed stack (skipping current href), or
 * 2. Explicit `overrideFallback` (page-provided), or
 * 3. Registry-based default parent for the current route.
 */
export function useBackTarget(overrideFallback?: BackTarget): BackTarget {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? '';
  const currentHref = search ? `${pathname}?${search}` : (pathname ?? '/');

  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const previous = navStack.peekBackFrom(currentHref);
  if (previous) return { href: previous.href, label: previous.label };
  if (overrideFallback) return overrideFallback;
  return resolveRouteFallback(currentHref);
}
