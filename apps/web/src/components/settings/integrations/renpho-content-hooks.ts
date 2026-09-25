'use client';

import {
  useRenphoConnect,
  useRenphoDisconnect,
  useRenphoSync,
} from '@/components/settings/integrations/renpho-content-hooks-parts';

export function useRenphoContentState(onUpdated?: () => void, onSyncStart?: () => void) {
  const connectState = useRenphoConnect(onUpdated);
  const syncState = useRenphoSync(onUpdated, onSyncStart);
  const disconnectState = useRenphoDisconnect(onUpdated);

  return {
    ...connectState,
    ...syncState,
    ...disconnectState,
  };
}
