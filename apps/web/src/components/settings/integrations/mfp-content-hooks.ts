'use client';

import {
  useMfpConnect,
  useMfpDisconnect,
  useMfpSync,
} from '@/components/settings/integrations/mfp-content-hooks-parts';

export function useMfpContentState(onUpdated?: () => void, onSyncStart?: () => void) {
  const syncState = useMfpSync(onUpdated, onSyncStart);
  const disconnectState = useMfpDisconnect(onUpdated);
  const connectState = useMfpConnect(onUpdated);

  return {
    ...syncState,
    ...disconnectState,
    ...connectState,
  };
}
