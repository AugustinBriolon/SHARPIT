'use client';

import {
  useWithingsDisconnect,
  useWithingsSync,
} from '@/components/settings/integrations/withings-content-hooks-parts';

export function useWithingsContentState(onUpdated?: () => void, onSyncStart?: () => void) {
  const syncState = useWithingsSync(onUpdated, onSyncStart);
  const disconnectState = useWithingsDisconnect(onUpdated);

  return {
    ...syncState,
    ...disconnectState,
  };
}
