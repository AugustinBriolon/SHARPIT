'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { IntegrationDefinition } from '@/components/settings/integrations/types';
import { toast } from '@/components/ui/toast';
import { invalidateAfterProviderSync } from '@/lib/query/invalidate-after-provider-sync';
import {
  syncAllConnectedIntegrations,
  type RowSyncState,
} from '@/components/settings/integrations/hub-sync';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';

function reportHubSyncResults(results: string[], errors: string[]) {
  if (results.length > 0) {
    toast.success('Synchronisation terminée', { description: results.join(' · ') });
  } else if (errors.length === 0) {
    toast.success('Synchronisation terminée', {
      description: 'Aucune nouvelle donnée à importer.',
    });
  }
  if (errors.length > 0) {
    toast.error('Certaines sources ont échoué', { description: errors.join(' · ') });
  }
}

export function useHubSyncAll(connected: IntegrationDefinition[], guardDisabled: boolean) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [syncingAll, setSyncingAll] = useState(false);
  const [rowSync, setRowSync] = useState<Partial<Record<IntegrationId, RowSyncState>>>({});

  async function handleSyncAll() {
    if (guardDisabled) {
      return;
    }
    if (connected.length === 0) {
      toast.info('Aucune source connectée', {
        description: 'Connecte au moins une application pour synchroniser.',
      });
      return;
    }

    setSyncingAll(true);
    setRowSync({});
    const loadingToast = toast.loading('Synchronisation en cours', {
      description: `${connected.length} source${connected.length > 1 ? 's' : ''} à synchroniser.`,
    });

    try {
      const { results, errors } = await syncAllConnectedIntegrations(connected, setRowSync);

      await invalidateAfterProviderSync(queryClient);
      router.refresh();
      reportHubSyncResults(results, errors);
    } finally {
      toast.close(loadingToast);
      setSyncingAll(false);
      window.setTimeout(() => setRowSync({}), 2200);
    }
  }

  return { syncingAll, rowSync, handleSyncAll };
}
