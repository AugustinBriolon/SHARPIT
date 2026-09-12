'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { notifyIntegrationSyncStarted } from '@/components/settings/integrations/modal-sync-start';
import { toast } from '@/components/ui/toast';
import { runRenphoSync } from '@/lib/integrations/shared/client-sync';
import { connectRenpho, disconnectRenpho } from '@/lib/query/fetchers';
import { invalidateAfterProviderSync } from '@/lib/query/invalidate-after-provider-sync';
import { queryKeys } from '@/lib/query/keys';

export function useRenphoConnect(onUpdated?: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setConnecting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await connectRenpho({ email: form.get('email'), password: form.get('password') });
      toast.success('Renpho connecté');
      await queryClient.invalidateQueries({ queryKey: queryKeys.bodyComposition() });
      router.refresh();
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion échouée');
    } finally {
      setConnecting(false);
    }
  }

  return { connecting, error, handleConnect };
}

export function useRenphoSync(onUpdated?: () => void, onSyncStart?: () => void) {
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
      await toast.promise(runRenphoSync({ full }), {
        loading: full ? 'Import Renpho…' : 'Synchronisation Renpho…',
        success: (d) => ({
          title: 'Renpho synchronisé',
          description: `${d.imported} nouvelle(s) · ${d.updated} mise(s) à jour`,
        }),
        error: (err) => ({
          title: 'Échec Renpho',
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

export function useRenphoDisconnect(onUpdated?: () => void) {
  const router = useRouter();
  const [stage, setStage] = useState<'manage' | 'confirm'>('manage');
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectRenpho();
      router.refresh();
      onUpdated?.();
    } finally {
      setDisconnecting(false);
      setStage('manage');
    }
  }

  return { stage, disconnecting, setStage, handleDisconnect };
}
