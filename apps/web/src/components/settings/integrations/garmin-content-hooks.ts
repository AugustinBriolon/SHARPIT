'use client';

import type { IntegrationDefinition } from '@/components/settings/integrations/types';
import {
  useGarminDisconnect,
  useGarminImportTokens,
  useGarminSync,
} from '@/components/settings/integrations/garmin-content-hooks-parts';

export function useGarminContentState(
  integration: IntegrationDefinition,
  onUpdated?: () => void,
  onSyncStart?: () => void,
) {
  const importState = useGarminImportTokens(onUpdated);
  const syncState = useGarminSync(onUpdated, onSyncStart);
  const disconnectState = useGarminDisconnect(onUpdated);

  return {
    ...importState,
    ...syncState,
    ...disconnectState,
  };
}
