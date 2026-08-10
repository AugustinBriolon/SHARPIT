'use client';

import { useOnlineStatus } from '@/hooks/use-online-status';

export function useOfflineGuard(): {
  online: boolean;
  offline: boolean;
  guardDisabled: boolean;
  offlineLabel: string;
} {
  const online = useOnlineStatus();
  return {
    online,
    offline: !online,
    guardDisabled: !online,
    offlineLabel: 'Hors ligne',
  };
}

/**
 * CTA copy: pending wins, then offline, then idle.
 * Avoids nested ternaries at call sites (`no-nested-ternary`).
 */
export function guardedActionLabel(
  offline: boolean,
  offlineLabel: string,
  idleLabel: string,
  pending?: { active: boolean; label: string },
): string {
  if (pending?.active) return pending.label;
  if (offline) return offlineLabel;
  return idleLabel;
}
