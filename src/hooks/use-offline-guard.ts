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
