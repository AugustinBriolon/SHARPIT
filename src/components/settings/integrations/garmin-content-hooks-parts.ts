'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { notifyIntegrationSyncStarted } from '@/components/settings/integrations/modal-sync-start';
import { toast } from '@/components/ui/toast';
import { runGarminSync } from '@/lib/integrations/shared/client-sync';
import { invalidateAfterProviderSync } from '@/lib/query/invalidate-after-provider-sync';
import type { RecordChange } from '@/lib/training/records/records';

export function useGarminImportTokens(onUpdated?: () => void) {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedImport, setShowAdvancedImport] = useState(false);

  async function handleImportTokens(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setConnecting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const tokenStore = String(form.get('tokenStore') ?? '').trim();
    const response = await fetch('/api/garmin/import-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenStore }),
    });
    setConnecting(false);
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? 'Import échoué');
      return;
    }
    router.refresh();
    onUpdated?.();
  }

  return { connecting, error, showAdvancedImport, setShowAdvancedImport, handleImportTokens };
}

export function useGarminSync(onUpdated?: () => void, onSyncStart?: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [importingAll, setImportingAll] = useState(false);
  const [syncRecordChanges, setSyncRecordChanges] = useState<RecordChange[]>([]);

  async function handleSync(full = false) {
    notifyIntegrationSyncStarted({ onSyncStart });
    if (full) {
      setImportingAll(true);
    } else {
      setSyncing(true);
    }
    setSyncRecordChanges([]);
    try {
      const data = await toast.promise(runGarminSync({ full }), {
        loading: full ? 'Import historique Garmin…' : 'Synchronisation Garmin…',
        success: (d) => ({
          title: 'Garmin synchronisé',
          description: `${d.updated} jour(s) santé · ${d.activities.imported} séance(s)`,
        }),
        error: (err) => ({
          title: 'Échec Garmin',
          description: err instanceof Error ? err.message : undefined,
        }),
      });
      setSyncRecordChanges(Array.isArray(data.recordChanges) ? data.recordChanges : []);
      await invalidateAfterProviderSync(queryClient);
      router.refresh();
      onUpdated?.();
    } finally {
      setSyncing(false);
      setImportingAll(false);
    }
  }

  return { syncing, importingAll, syncRecordChanges, handleSync };
}

export function useGarminDisconnect(onUpdated?: () => void) {
  const router = useRouter();
  const [stage, setStage] = useState<'manage' | 'confirm'>('manage');
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch('/api/garmin/disconnect', { method: 'POST' });
      router.refresh();
      onUpdated?.();
    } finally {
      setDisconnecting(false);
      setStage('manage');
    }
  }

  return { stage, disconnecting, setStage, handleDisconnect };
}
