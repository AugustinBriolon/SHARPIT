'use client';

import type { IntegrationDefinition } from '@/components/settings/integrations/types';
import {
  useStravaBackfill,
  useStravaDisconnect,
  useStravaSync,
} from '@/components/settings/integrations/strava-content-hooks-parts';

export function useStravaContentState(
  integration: IntegrationDefinition,
  onUpdated?: () => void,
  onSyncStart?: () => void,
) {
  const avatarUrl = integration.account?.extra?.avatarUrl as string | undefined;
  const syncState = useStravaSync(onUpdated, onSyncStart);
  const backfillState = useStravaBackfill(onSyncStart);
  const disconnectState = useStravaDisconnect(onUpdated);

  return {
    avatarUrl,
    ...syncState,
    ...backfillState,
    ...disconnectState,
  };
}
