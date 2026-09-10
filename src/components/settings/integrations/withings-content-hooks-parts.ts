'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { notifyIntegrationSyncStarted } from '@/components/settings/integrations/modal-sync-start';
import { toast } from '@/components/ui/toast';
import { runWithingsSync } from '@/lib/integrations/shared/client-sync';
import { invalidateAfterProviderSync } from '@/lib/query/invalidate-after-provider-sync';

export function useWithingsSync(onUpdated?: () => void, onSyncStart?: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [importingAll, setImportingAll] = useState(false);

  async function handleSync(full = false) {
    notifyIntegrationSyncStarted({ onSyncStart });
    if (full) {
      setImportingAll(true);
    } else {
      setSyncing(true);
    }
    try {
      await toast.promise(runWithingsSync({ full }), {
        loading: full ? 'Import historique Withings…' : 'Synchronisation Withings…',
        success: (d) => ({
          title: 'Withings synchronisé',
          description: `${d.imported} nouvelle(s) · ${d.updated} mise(s) à jour`,
        }),
        error: (err) => ({
          title: 'Échec Withings',
          description: err instanceof Error ? err.message : undefined,
        }),
      });
      await invalidateAfterProviderSync(queryClient);
      router.refresh();
      onUpdated?.();
    } finally {
      setSyncing(false);
      setImportingAll(false);
    }
  }

  return { syncing, importingAll, handleSync };
}

export function useWithingsDisconnect(onUpdated?: () => void) {
  const router = useRouter();
  const [stage, setStage] = useState<'manage' | 'confirm'>('manage');
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch('/api/withings/disconnect', { method: 'POST' });
      router.refresh();
      onUpdated?.();
    } finally {
      setDisconnecting(false);
      setStage('manage');
    }
  }

  return { stage, disconnecting, setStage, handleDisconnect };
}
