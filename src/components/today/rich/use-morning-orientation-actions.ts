'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState, useTransition } from 'react';
import { toast } from '@/components/ui/toast';
import { postMorningRecalibration } from '@/components/today/rich/morning-orientation-recalibration';
import { queryKeys } from '@/lib/query/keys';

export function useMorningOrientationActions({
  trainingDayId,
  onRefreshed,
  guardDisabled,
}: {
  trainingDayId: string;
  onRefreshed?: () => void;
  guardDisabled: boolean;
}) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<'refresh' | 'hold' | 'apply' | null>(null);
  const [, startTransition] = useTransition();

  const refreshCaches = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.presentationToday(trainingDayId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.athleteSnapshot(trainingDayId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions }),
    ]);
    onRefreshed?.();
  }, [onRefreshed, queryClient, trainingDayId]);

  async function refreshEvidence() {
    if (guardDisabled) {
      return;
    }
    setPending('refresh');
    try {
      const res = await fetch(
        `/api/athlete-state/refresh?trainingDayId=${trainingDayId}&forceSync=true`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'today_refresh' }),
        },
      );
      if (!res.ok) {
        toast.error('Actualisation impossible — réessaie dans un instant.');
        return;
      }
      await refreshCaches();
    } catch {
      toast.error('Hors ligne ou erreur réseau — dernière info connue conservée.');
    } finally {
      setPending(null);
    }
  }

  async function actRecalibration(
    action: 'accept' | 'reject',
    decisionId: string,
    direction: 'DOWN' | 'UP' | null,
  ) {
    if (guardDisabled) {
      return;
    }
    setPending(action === 'reject' ? 'hold' : 'apply');
    try {
      await postMorningRecalibration({
        action,
        decisionId,
        direction,
        trainingDayId,
        onSuccess: () => startTransition(() => void refreshCaches()),
      });
    } catch {
      toast.error('Action impossible');
    } finally {
      setPending(null);
    }
  }

  return { actRecalibration, pending, refreshEvidence };
}
