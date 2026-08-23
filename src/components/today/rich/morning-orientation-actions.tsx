'use client';

import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useCallback, useState, useSyncExternalStore, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { formatPlannedDuration } from '@/lib/planned-session/sessions';
import { queryKeys } from '@/lib/query/keys';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import { guardedActionLabel, useOfflineGuard } from '@/hooks/use-offline-guard';
import { cn } from '@/lib/utils';
import { useAppModal } from '@/providers/app-modal-provider';

const HOLD_STORAGE_PREFIX = 'sharpit.morning-hold.';

/** Same-tab notify — native `storage` only fires cross-tab. */
const MORNING_HOLD_EVENT = 'sharpit:morning-hold-changed';

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

function emitMorningHoldChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(MORNING_HOLD_EVENT));
}

export function writeClientMorningHold(trainingDayId: string): void {
  try {
    sessionStorage.setItem(morningHoldStorageKey(trainingDayId), '1');
    emitMorningHoldChanged();
  } catch {
    // ignore quota / private mode
  }
}

function subscribeMorningHold(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(MORNING_HOLD_EVENT, callback);
  return () => window.removeEventListener(MORNING_HOLD_EVENT, callback);
}

/**
 * Hydration-safe morning "keep plan" hold.
 * Server + first client paint: always false (passthrough). After hydrate, reads sessionStorage.
 */
export function useClientMorningHold(trainingDayId: string): boolean {
  return useSyncExternalStore(
    subscribeMorningHold,
    () => readClientMorningHold(trainingDayId),
    () => false,
  );
}

type MorningOrientation = NonNullable<TodayViewModel['morningOrientation']>;
type Proposal = NonNullable<MorningOrientation['confirmEase']>;
type SessionSide = Proposal['current'];

function compareMeta(current: SessionSide, proposed: SessionSide): string | null {
  const parts: string[] = [];
  const duration = proposed.durationMin ?? current.durationMin;
  if (duration != null) parts.push(formatPlannedDuration(duration));
  if (current.load != null && proposed.load != null && current.load !== proposed.load) {
    parts.push(`${current.load} → ${proposed.load} TSS`);
  } else if (proposed.load != null) {
    parts.push(`${proposed.load} TSS`);
  } else if (current.load != null) {
    parts.push(`${current.load} TSS`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * Morning firm actions — Actualiser (evidence) · comparaison plan vs proposé.
 * Post-choice has no card — annotation lives on the session chip.
 */
export function MorningOrientationActions({
  trainingDayId,
  orientation,
  onRefreshed,
}: {
  trainingDayId: string;
  orientation: MorningOrientation;
  onRefreshed?: () => void;
}) {
  const queryClient = useQueryClient();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const { openPlannedSession } = useAppModal();
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
    if (guardDisabled) return;
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
    if (guardDisabled) return;
    setPending(action === 'reject' ? 'hold' : 'apply');

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
      if (action === 'reject') toast.success('Plan tenu');
      else if (direction === 'UP') toast.success('Hausse appliquée');
      else toast.success('Ajustement appliqué');
    } catch {
      toast.error('Action impossible');
    } finally {
      setPending(null);
    }
  }

  if (orientation.phase === 'POST_CHOICE') return null;

  if (orientation.phase === 'EVIDENCE_PENDING' && orientation.showRefreshEvidence) {
    return (
      <div className="space-y-2">
        {orientation.evidenceLine ? (
          <p className="text-muted-foreground px-0.5 text-xs leading-relaxed">
            {orientation.evidenceLine}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={guardDisabled || pending === 'refresh'}
            size="sm"
            type="button"
            variant="accent"
            onClick={() => void refreshEvidence()}
          >
            <RefreshCw className={cn('size-3.5', pending === 'refresh' && 'animate-spin')} />
            {guardedActionLabel(offline, offlineLabel, 'Actualiser les données', {
              active: pending === 'refresh',
              label: 'Actualisation…',
            })}
          </Button>
        </div>
      </div>
    );
  }

  if (orientation.phase !== 'ORIENTATION_READY' || !orientation.showFirmActions) {
    return null;
  }

  const proposal: Proposal | null = orientation.confirmEase ?? orientation.confirmIncrease;
  const decisionId = orientation.holdDecisionId ?? proposal?.decisionId ?? null;
  if (!proposal || !decisionId) return null;

  const direction: 'DOWN' | 'UP' = orientation.confirmIncrease ? 'UP' : 'DOWN';
  const busy = pending != null;
  const detailSessionId = proposal.sessionId || null;
  const fromLabel = proposal.current.intensityLabel ?? '—';
  const toLabel = proposal.proposed.intensityLabel ?? '—';
  const meta = compareMeta(proposal.current, proposal.proposed);
  const morningProposal = {
    why: proposal.why,
    changeSummary: proposal.changeSummary,
    current: proposal.current,
    proposed: proposal.proposed,
  };

  function openDetails() {
    if (!detailSessionId) return;
    openPlannedSession({
      morningProposal,
      sessionId: detailSessionId,
    });
  }

  let statusMessage: string | null = null;
  if (pending === 'refresh') statusMessage = 'Actualisation des preuves en cours.';
  else if (pending === 'apply') statusMessage = 'Application de la proposition en cours.';
  else if (pending === 'hold') statusMessage = 'Conservation du plan en cours.';

  return (
    <section
      aria-busy={busy || undefined}
      aria-label="Proposition du matin"
      className="space-y-2.5"
    >
      {statusMessage ? (
        <p aria-live="polite" className="sr-only" role="status">
          {statusMessage}
        </p>
      ) : null}
      {/* Minimal chip: plan → proposée + pastille → (InstrumentListChip) */}
      <button
        disabled={!detailSessionId}
        type="button"
        aria-label={
          detailSessionId
            ? `Voir le détail · ${fromLabel} vers ${toLabel}`
            : `Proposition · ${fromLabel} vers ${toLabel}`
        }
        className={cn(
          'chip-surface-lg group rounded-analysis flex min-h-11 w-full items-center gap-3 border px-3.5 py-3 text-left',
          'border-highlight/50 transition-[border-color,background-color,transform]',
          detailSessionId && 'hover:border-highlight/80 hover:bg-highlight/10',
          !detailSessionId && 'cursor-default',
        )}
        onClick={openDetails}
        onFocus={() => {
          if (detailSessionId) prefetchPlannedSessionDetail(queryClient, detailSessionId);
        }}
        onPointerEnter={() => {
          if (detailSessionId) prefetchPlannedSessionDetail(queryClient, detailSessionId);
        }}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm leading-snug font-medium">
            <span className="text-muted-foreground">{fromLabel}</span>
            <span className="text-muted-foreground/40 mx-1.5" aria-hidden>
              →
            </span>
            <span className="text-highlight-foreground">{toLabel}</span>
          </span>
          {meta ? (
            <span className="text-data text-muted-foreground text-xs tabular-nums">{meta}</span>
          ) : null}
          {proposal.why ? (
            <span className="text-muted-foreground mt-0.5 text-xs leading-snug">
              {proposal.why}
            </span>
          ) : null}
        </span>
        <span
          className="bg-highlight text-highlight-foreground text-data inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs transition-transform group-hover:translate-x-0.5"
          aria-hidden
        >
          →
        </span>
      </button>

      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <Button
          className="h-11 w-full rounded-full lg:h-9 lg:w-auto"
          disabled={guardDisabled || busy}
          type="button"
          variant="highlight"
          onClick={() => void actRecalibration('accept', decisionId, direction)}
        >
          {guardedActionLabel(offline, offlineLabel, 'Appliquer la proposée', {
            active: pending === 'apply',
            label: 'Application…',
          })}
        </Button>
        <Button
          className="h-11 w-full lg:h-9 lg:w-auto"
          disabled={guardDisabled || busy}
          type="button"
          variant="ghost"
          onClick={() => void actRecalibration('reject', decisionId, null)}
        >
          {guardedActionLabel(offline, offlineLabel, 'Garder le plan', {
            active: pending === 'hold',
            label: 'Conservation…',
          })}
        </Button>
      </div>
    </section>
  );
}
