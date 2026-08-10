'use client';

import { useOffline } from 'next/offline';

/**
 * Single source of connectivity for OfflineBanner, the Today offline fallback,
 * and mutation-button disabling.
 *
 * Backed by Next's offline detection (`experimental.useOffline`) rather than
 * `navigator.onLine`: it flips on a request that actually failed, not merely on
 * a network interface going down, so captive portals and dead upstreams count
 * as offline. It also polls to confirm recovery instead of trusting a single
 * `online` event.
 *
 * Returns `false` during server render and before hydration, which keeps the
 * banner out of the prerendered shell.
 */
export function useOnlineStatus(): boolean {
  return !useOffline();
}
