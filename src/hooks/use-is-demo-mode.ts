'use client';

import { useSyncExternalStore } from 'react';
import { DEMO_COOKIE } from '@/lib/demo/demo-cookie';

/** Pulled out of the DOM read so it's testable with a plain string — this repo's
 * vitest config runs `.test.ts` files under `environment: 'node'`, no `document`. */
export function hasDemoCookieValue(cookieString: string): boolean {
  return cookieString.split('; ').includes(`${DEMO_COOKIE}=1`);
}

function hasDemoCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return hasDemoCookieValue(document.cookie);
}

const noopSubscribe = () => () => {};

/**
 * UI-only signal for demo-aware client components (date-range fencing, etc).
 * The cookie is set/cleared only via full page loads (`/demo`, `/api/demo/exit`),
 * so no subscription is needed — just a hydration-safe read (server always
 * renders `false`, client corrects on mount).
 *
 * Not the security boundary — that's `isDemoSession()` (src/lib/demo/demo-session.ts),
 * which also confirms there's no real Clerk session. This hook can't do that
 * check client-side, so a real signed-in athlete with a stray demo cookie may
 * see date-range fencing they don't actually need — harmless (UI-only), and
 * resolves itself the moment they visit /api/demo/exit.
 */
export function useIsDemoMode(): boolean {
  return useSyncExternalStore(noopSubscribe, hasDemoCookie, () => false);
}
