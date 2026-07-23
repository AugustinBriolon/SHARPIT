'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { navStack } from '@/lib/navigation/nav-stack';
import { resolveRouteFallback } from '@/lib/navigation/route-registry';

export type BackTarget = { href: string; label: string };

export type BackTargetResolution = BackTarget & {
  /** True when the target came from the app nav stack (prefer history.back). */
  fromStack: boolean;
};

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

/**
 * Notify subscribers that the stack changed. Called by the tracker after each push.
 */
export function emitNavStackChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(NAV_STACK_EVENT));
}

/** Registry / override only — safe for SSR + hydration. */
export function resolveBackTargetWithoutStack(
  currentHref: string,
  overrideFallback?: BackTarget,
): BackTargetResolution {
  if (overrideFallback) return { ...overrideFallback, fromStack: false };
  return { ...resolveRouteFallback(currentHref), fromStack: false };
}

/** Stack-aware resolution — client only, after hydration. */
export function resolveBackTarget(
  currentHref: string,
  overrideFallback?: BackTarget,
): BackTargetResolution {
  const previous = navStack.peekBackFrom(currentHref);
  if (previous) return { href: previous.href, label: previous.label, fromStack: true };
  return resolveBackTargetWithoutStack(currentHref, overrideFallback);
}

function serializeTarget(target: BackTargetResolution): string {
  return `${target.href}\0${target.label}\0${target.fromStack ? '1' : '0'}`;
}

function deserializeTarget(serialized: string): BackTargetResolution {
  const [href = '', label = '', flag = '0'] = serialized.split('\0');
  return { href, label, fromStack: flag === '1' };
}

/**
 * Resolve where Back should send the athlete right now.
 *
 * 1. Previous entry on the app-managed stack (skipping current href), or
 * 2. Explicit `overrideFallback` (page-provided), or
 * 3. Registry-based default parent for the current route.
 *
 * Hydration-safe: the stack is only read in the client snapshot. SSR and the
 * hydrate pass use the registry fallback so server HTML matches the first client paint.
 */
export function useBackTarget(overrideFallback?: BackTarget): BackTargetResolution {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? '';
  const currentHref = search ? `${pathname}?${search}` : (pathname ?? '/');

  const serialized = useSyncExternalStore(
    subscribe,
    () => serializeTarget(resolveBackTarget(currentHref, overrideFallback)),
    () => serializeTarget(resolveBackTargetWithoutStack(currentHref, overrideFallback)),
  );

  return deserializeTarget(serialized);
}
