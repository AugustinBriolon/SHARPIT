'use client';

import { useAuth } from '@clerk/nextjs';
import { useSyncExternalStore } from 'react';
import { DEMO_COOKIE } from '@/lib/demo/demo-cookie';

/** Pulled out of the DOM read so it's testable with a plain string — this repo's
 * vitest config runs `.test.ts` files under `environment: 'node'`, no `document`. */
export function hasDemoCookieValue(cookieString: string): boolean {
  return cookieString.split('; ').includes(`${DEMO_COOKIE}=1`);
}

/**
 * Same precedence as server `isDemoSession()`: a real Clerk session always wins
 * over a leftover `sharpit_demo` cookie (signed-in athlete who once visited /demo).
 */
export function resolveIsDemoMode(
  cookieIsDemo: boolean,
  userId: string | null | undefined,
  authLoaded: boolean,
): boolean {
  if (!authLoaded) {
    return false;
  }
  if (userId) {
    return false;
  }
  return cookieIsDemo;
}

function hasDemoCookie(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  return hasDemoCookieValue(document.cookie);
}

const noopSubscribe = () => () => {};

/**
 * UI signal for demo-aware client components.
 * Matches server `isDemoSession()`: demo cookie AND no Clerk `userId`.
 * Until Clerk has loaded, returns `false` (hydration-safe; avoids flashing
 * demo chrome for a signed-in athlete with a stray cookie).
 *
 * Cookie is set/cleared via full page loads (`/demo`, `/api/demo/exit`).
 */
export function useIsDemoMode(): boolean {
  const { userId, isLoaded } = useAuth();
  const cookieIsDemo = useSyncExternalStore(noopSubscribe, hasDemoCookie, () => false);
  return resolveIsDemoMode(cookieIsDemo, userId, isLoaded);
}
