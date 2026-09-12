'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { notifyIntegrationSyncStarted } from '@/components/settings/integrations/modal-sync-start';
import { toast } from '@/components/ui/toast';
import { runMfpSync } from '@/lib/integrations/shared/client-sync';
import { connectMyFitnessPal, disconnectMyFitnessPal } from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';

export function useMfpSync(onUpdated?: () => void, onSyncStart?: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    notifyIntegrationSyncStarted({ onSyncStart });
    setSyncing(true);
    try {
      await toast.promise(runMfpSync(), {
        loading: 'Synchronisation MyFitnessPal…',
        success: (result) =>
          result.synced > 0 ? `${result.synced} jour(s) synchronisé(s)` : 'MyFitnessPal à jour',
        error: (err) =>
          err instanceof Error ? err.message : 'Synchronisation MyFitnessPal échouée',
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.presentationRoot });
      onUpdated?.();
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  return { syncing, handleSync };
}

export function useMfpDisconnect(onUpdated?: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [disconnecting, setDisconnecting] = useState(false);
  const [stage, setStage] = useState<'manage' | 'confirm'>('manage');

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectMyFitnessPal();
      await queryClient.invalidateQueries({ queryKey: queryKeys.presentationRoot });
      onUpdated?.();
      router.refresh();
    } finally {
      setDisconnecting(false);
      setStage('manage');
    }
  }

  return { disconnecting, stage, setStage, handleDisconnect };
}

export function useMfpConnect(onUpdated?: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  async function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setConnecting(true);
    setConnectError(null);
    const form = new FormData(e.currentTarget);
    try {
      await connectMyFitnessPal({ sessionToken: form.get('sessionToken') });
      await queryClient.invalidateQueries({ queryKey: queryKeys.presentationRoot });
      onUpdated?.();
      router.refresh();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Connexion échouée');
    } finally {
      setConnecting(false);
    }
  }

  return { connecting, connectError, handleConnect };
}
