'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { guardedActionLabel, useOfflineGuard } from '@/hooks/use-offline-guard';
import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
import {
  buildIntegrations,
  type IntegrationDefinition,
  type IntegrationsPayload,
} from '@/components/settings/integrations/types';
import { useHubSyncAll } from '@/components/settings/integrations/hub-hooks-parts';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import type { IntegrationSourcePrefs } from '@/lib/integrations/source-prefs';

export function useIntegrationsHub(
  payload: IntegrationsPayload,
  initialPrefs: IntegrationSourcePrefs,
) {
  const router = useRouter();
  const integrations = useMemo(() => buildIntegrations(payload), [payload]);
  const byId = useMemo(
    () =>
      Object.fromEntries(integrations.map((i) => [i.id, i])) as Record<
        IntegrationId,
        IntegrationDefinition
      >,
    [integrations],
  );
  const [prefs, setPrefs] = useState(initialPrefs);
  const [openId, setOpenId] = useState<IntegrationId | null>(null);
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();

  useResetWhenHidden(() => setOpenId(null));

  const connected = integrations.filter((i) => i.connected);
  const active = openId ? integrations.find((i) => i.id === openId) : null;
  const { syncingAll, rowSync, handleSyncAll } = useHubSyncAll(connected, guardDisabled);

  return {
    integrations,
    byId,
    prefs,
    setPrefs,
    openId,
    setOpenId,
    syncingAll,
    rowSync,
    offline,
    guardDisabled,
    offlineLabel,
    connected,
    active,
    handleSyncAll,
    router,
  };
}

export function syncAllButtonLabel(
  offline: boolean,
  offlineLabel: string,
  syncingAll: boolean,
): string {
  return guardedActionLabel(offline, offlineLabel, 'Tout synchroniser', {
    active: syncingAll,
    label: 'Synchronisation…',
  });
}
