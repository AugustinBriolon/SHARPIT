'use client';

import {
  useGoogleCalendarSelection,
  useGoogleDisconnect,
  useGoogleSync,
} from '@/components/settings/integrations/google-content-hooks-parts';
import type { IntegrationDefinition } from '@/components/settings/integrations/types';

export function useGoogleContentState(
  integration: IntegrationDefinition,
  onUpdated?: () => void,
  onSyncStart?: () => void,
) {
  const calendarState = useGoogleCalendarSelection(integration, onUpdated);
  const syncState = useGoogleSync(onUpdated, onSyncStart);
  const disconnectState = useGoogleDisconnect(onUpdated);

  return {
    ...calendarState,
    ...syncState,
    ...disconnectState,
  };
}
