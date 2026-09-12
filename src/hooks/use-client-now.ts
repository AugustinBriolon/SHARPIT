'use client';

import { useSyncExternalStore } from 'react';

const subscribeNoop = () => () => undefined;

let sessionNow: Date | null = null;

function readClientNow(): Date {
  if (!sessionNow) {
    sessionNow = new Date();
  }
  return sessionNow;
}

/** Test helper — clear the session clock. */
export function resetClientNowForTests(): void {
  sessionNow = null;
}

/**
 * Wall clock after hydration only. Returns `null` during SSR/prerender so
 * callers never touch `new Date()` while Next blocks current time.
 * First client snapshot seeds a stable session `Date` (no per-render churn).
 */
export function useClientNow(): Date | null {
  return useSyncExternalStore(subscribeNoop, readClientNow, () => null);
}
