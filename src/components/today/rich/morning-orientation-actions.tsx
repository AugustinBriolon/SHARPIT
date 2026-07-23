'use client';

import { useCallback, useState, useTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { queryKeys } from '@/lib/query/keys';
import { cn } from '@/lib/utils';

const HOLD_STORAGE_PREFIX = 'sharpit.morning-hold.';

export function morningHoldStorageKey(trainingDayId: string): string {
  return `${HOLD_STORAGE_PREFIX}${trainingDayId}`;
}

export function readClientMorningHold(trainingDayId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(morningHoldStorageKey(trainingDayId)) === '1';
  } catch {
    return false;
  }
}

export function writeClientMorningHold(trainingDayId: string): void {
  try {
    sessionStorage.setItem(morningHoldStorageKey(trainingDayId), '1');
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Morning firm actions: Actualiser (A) · Tenir / Confirmer allègement|hausse (B).
 * Post-choice has no card — annotation lives on the session chip.
 */
export function MorningOrientationActions({
  trainingDayId,
  orientation,
  onRefreshed,
}: {
  trainingDayId: string;
  orientation: NonNullable<TodayViewModel['morningOrientation']>;
  onRefreshed?: () => void;
}) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<'refresh' | 'hold' | 'ease' | 'increase' | null>(null);
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
    let nextPending: 'hold' | 'ease' | 'increase' = 'ease';
    if (action === 'reject') nextPending = 'hold';
    else if (direction === 'UP') nextPending = 'increase';
    setPending(nextPending);
    try {
      const res = await fetch('/api/morning-recalibration/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionId, action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Action impossible');
        return;
      }
      if (action === 'reject') writeClientMorningHold(trainingDayId);
      startTransition(() => {
        void refreshCaches();
      });
      if (action === 'reject') toast.success('Séance tenue');
      else if (direction === 'UP') toast.success('Hausse confirmée');
      else toast.success('Allègement confirmé');
    } catch {
      toast.error('Action impossible');
    } finally {
      setPending(null);
    }
  }

  if (orientation.phase === 'POST_CHOICE') {
    return null;
  }

  if (orientation.phase === 'EVIDENCE_PENDING' && orientation.showRefreshEvidence) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={pending === 'refresh'}
          size="sm"
          type="button"
          variant="accent"
          onClick={() => void refreshEvidence()}
        >
          <RefreshCw className={cn('size-3.5', pending === 'refresh' && 'animate-spin')} />
          Actualiser les preuves
        </Button>
      </div>
    );
  }

  if (orientation.phase !== 'ORIENTATION_READY' || !orientation.showFirmActions) {
    return null;
  }

  // Firm actions only appear with a proposal — Tenir rejects it, Confirm accepts.
  const decisionId =
    orientation.holdDecisionId ??
    orientation.confirmEase?.decisionId ??
    orientation.confirmIncrease?.decisionId;
  if (!decisionId) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        disabled={pending != null}
        size="sm"
        type="button"
        variant="default"
        onClick={() => void actRecalibration('reject', decisionId, null)}
      >
        Tenir
      </Button>
      {orientation.confirmEase ? (
        <Button
          disabled={pending != null}
          size="sm"
          type="button"
          variant="accent"
          onClick={() =>
            void actRecalibration('accept', orientation.confirmEase!.decisionId, 'DOWN')
          }
        >
          Confirmer l’allègement
        </Button>
      ) : null}
      {orientation.confirmIncrease ? (
        <Button
          disabled={pending != null}
          size="sm"
          type="button"
          variant="accent"
          onClick={() =>
            void actRecalibration('accept', orientation.confirmIncrease!.decisionId, 'UP')
          }
        >
          Confirmer la hausse
        </Button>
      ) : null}
    </div>
  );
}
