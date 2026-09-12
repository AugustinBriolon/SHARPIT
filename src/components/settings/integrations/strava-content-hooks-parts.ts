'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { notifyIntegrationSyncStarted } from '@/components/settings/integrations/modal-sync-start';
import { toast } from '@/components/ui/toast';
import {
  runStravaBackfill,
  runStravaSync,
  stravaBackfillSummary,
} from '@/lib/integrations/shared/client-sync';
import { invalidateAfterProviderSync } from '@/lib/query/invalidate-after-provider-sync';
import { disconnectStrava } from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';
import type { RecordChange } from '@/lib/training/records/records';

export function useStravaSync(onUpdated?: () => void, onSyncStart?: () => void) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [syncRecordChanges, setSyncRecordChanges] = useState<RecordChange[]>([]);

  async function handleSync() {
    notifyIntegrationSyncStarted({ onSyncStart });
    setSyncing(true);
    setSyncRecordChanges([]);
    try {
      const data = await toast.promise(runStravaSync(), {
        loading: 'Synchronisation Strava…',
        success: (r) => ({
          title: 'Strava synchronisé',
          description: `${r.imported} importée(s), ${r.skipped} ignorée(s).`,
        }),
        error: (err) => ({
          title: 'Échec Strava',
          description: err instanceof Error ? err.message : undefined,
        }),
      });
      setSyncRecordChanges(Array.isArray(data.recordChanges) ? data.recordChanges : []);
      await invalidateAfterProviderSync(queryClient, { includeBodyComposition: false });
      router.refresh();
      onUpdated?.();
    } finally {
      setSyncing(false);
    }
  }

  return { syncing, syncRecordChanges, handleSync };
}

export function useStravaBackfill(onSyncStart?: () => void) {
  const queryClient = useQueryClient();
  const [backfilling, setBackfilling] = useState(false);

  async function handleBackfill() {
    notifyIntegrationSyncStarted({ onSyncStart });
    setBackfilling(true);
    try {
      await toast.promise(runStravaBackfill(), {
        loading: 'Récupération des données détaillées…',
        success: (r) => ({
          title: 'Données détaillées',
          description: stravaBackfillSummary(r),
        }),
        error: (err) => ({
          title: 'Échec récupération',
          description: err instanceof Error ? err.message : undefined,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.records });
    } finally {
      setBackfilling(false);
    }
  }

  return { backfilling, handleBackfill };
}

export function useStravaDisconnect(onUpdated?: () => void) {
  const router = useRouter();
  const [stage, setStage] = useState<'manage' | 'confirm'>('manage');
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectStrava();
      router.refresh();
      onUpdated?.();
    } finally {
      setDisconnecting(false);
      setStage('manage');
    }
  }

  return { stage, disconnecting, setStage, handleDisconnect };
}
