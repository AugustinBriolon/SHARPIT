'use client';

import { Loader2, ListRestart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ProfileContextBanner } from '@/components/profile/profile-context-banner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { ClientPlannedSession } from '@/lib/query/types';
import {
  useAdaptPlan,
  type AdaptChange,
  type AdaptPlanResult,
  type CoachGenerationProgress,
} from '@/hooks/use-coach';
import { CoachGenerationProgressPanel } from '@/components/coach/plan/generation-progress';
import { usePlannedSessions, usePlannedSessionMutations, useTrainingPlan } from '@/hooks/use-data';
import type { GateSessionResult } from '@/lib/plan-gate/types';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { warmCoachContext } from '@/lib/coach/warm-coach-context';
import { AdaptChangeRow } from '@/components/coach/plan/adapt-change-row';
import { buildAdaptBatchOps } from '@/components/coach/plan/plan-adapter-apply';
import { Check } from 'lucide-react';

/** REMOVE changes bypass the Gate (see coach/adapt/route.ts) — only ADD/MODIFY changes have a gate result. */
function gateKey(change: Pick<AdaptChange, 'action' | 'sessionId' | 'date' | 'type'>): string {
  return `${change.action}:${change.sessionId ?? ''}:${change.date ?? ''}:${change.type ?? ''}`;
}

function buildGateResultLookup(result: AdaptPlanResult): Map<string, GateSessionResult> {
  const map = new Map<string, GateSessionResult>();
  for (const sessionResult of result.gate.sessions) {
    const p = sessionResult.proposal;
    map.set(
      gateKey({ action: p.action, sessionId: p.sessionId, date: p.date, type: p.type }),
      sessionResult,
    );
  }
  return map;
}

function renderAdaptButtonContent(
  isAdapting: boolean,
  offline: boolean,
  offlineLabel: string,
  hasResult: boolean,
) {
  if (isAdapting) {
    return (
      <>
        <Loader2 className="size-4 animate-spin" /> Analyse…
      </>
    );
  }
  if (offline) {
    return offlineLabel;
  }
  return (
    <>
      <ListRestart className="size-4" />
      {hasResult ? 'Régénérer les propositions' : 'Proposer des ajustements'}
    </>
  );
}

function renderApplyButtonContent(
  applied: boolean,
  isApplying: boolean,
  offline: boolean,
  offlineLabel: string,
) {
  if (offline) {
    return offlineLabel;
  }
  if (applied) {
    return (
      <>
        <Check className="size-4" /> Appliqué
      </>
    );
  }
  if (isApplying) {
    return (
      <>
        <Loader2 className="size-4 animate-spin" /> Application…
      </>
    );
  }
  return 'Appliquer';
}

function PlanAdapterResults({
  applyError,
  applied,
  gateResults,
  guardDisabled,
  isApplying,
  offline,
  offlineLabel,
  onApply,
  onClose,
  result,
  selected,
  sessionsById,
  toggle,
}: {
  applyError: string | null;
  applied: boolean;
  gateResults: Map<string, GateSessionResult>;
  guardDisabled: boolean;
  isApplying: boolean;
  offline: boolean;
  offlineLabel: string;
  onApply: () => void;
  onClose: () => void;
  result: AdaptPlanResult;
  selected: Set<number>;
  sessionsById: Map<string, ClientPlannedSession>;
  toggle: (i: number) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="border-primary/20 bg-primary/5 text-muted-foreground rounded-md border p-3 text-sm">
        {result.summary}
      </p>

      {result.changes.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Aucun ajustement nécessaire : ton plan est cohérent. 👍
        </p>
      )}

      <div className="space-y-2">
        {result.changes.map((change, i) => {
          const existing = change.sessionId ? sessionsById.get(change.sessionId) : null;
          const gateResult = gateResults.get(gateKey(change));
          const rejected = gateResult?.status === 'REJECTED';
          return (
            <AdaptChangeRow
              key={i}
              change={change}
              existing={existing ?? null}
              gateResult={gateResult}
              index={i}
              rejected={rejected}
              selected={selected.has(i)}
              onToggle={toggle}
            />
          );
        })}
      </div>

      {applyError && <p className="text-destructive text-sm">{applyError}</p>}

      {result.changes.length > 0 && (
        <div className="border-border/60 flex items-center justify-between gap-2 border-t pt-3">
          <span className="text-muted-foreground text-xs">
            {selected.size} ajustement(s) sélectionné(s)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button
              disabled={guardDisabled || isApplying || selected.size === 0 || applied}
              onClick={onApply}
            >
              {renderApplyButtonContent(applied, isApplying, offline, offlineLabel)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PlanAdapter({
  onClose,
  initialFocus,
}: {
  onClose: () => void;
  initialFocus?: string;
}) {
  const [focus, setFocus] = useState(initialFocus ?? '');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    warmCoachContext({ includeScenario: true });
  }, []);

  const [progress, setProgress] = useState<CoachGenerationProgress | null>(null);
  const adapt = useAdaptPlan(setProgress);
  const plannedQuery = usePlannedSessions();
  const planQuery = useTrainingPlan();
  const { applyBatch } = usePlannedSessionMutations();
  const result = adapt.data;
  const defaultGoalId = planQuery.data?.goalId ?? null;

  const sessionsById = useMemo(() => {
    const map = new Map<string, ClientPlannedSession>();
    for (const s of plannedQuery.data ?? []) {
      map.set(s.id, s);
    }
    return map;
  }, [plannedQuery.data]);

  const gateResults = useMemo(() => (result ? buildGateResultLookup(result) : new Map()), [result]);

  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();

  async function handleAdapt() {
    if (guardDisabled) {
      return;
    }
    setApplyError(null);
    setApplied(false);
    setProgress(null);
    const res = await adapt.mutateAsync({
      days: 14,
      focus: focus.trim() || undefined,
    });
    const resultsByKey = buildGateResultLookup(res);
    const keepIndices = res.changes
      .map((change, i) => ({ change, i }))
      .filter(({ change }) => resultsByKey.get(gateKey(change))?.status !== 'REJECTED')
      .map(({ i }) => i);
    setSelected(new Set(keepIndices));
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  }

  function handleApply() {
    if (guardDisabled || !result) {
      return;
    }
    setApplyError(null);
    const changes = result.changes.filter((_, i) => selected.has(i));
    const ops = buildAdaptBatchOps(changes, sessionsById, defaultGoalId);

    if (ops.length === 0) {
      return;
    }

    setApplied(true);
    applyBatch.mutate(ops, {
      onError: (err) => {
        setApplied(false);
        setApplyError(err instanceof Error ? err.message : 'Erreur');
      },
    });
    setTimeout(onClose, 400);
  }

  const isAdapting = adapt.isPending;
  const isApplying = applyBatch.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListRestart className="text-primary size-4" />
            Ajuster mon planning
          </DialogTitle>
          <DialogDescription>
            Le coach analyse ce que tu as réellement fait et propose des modifications sur tes
            séances déjà planifiées (14 prochains jours), sans tout recréer.
          </DialogDescription>
        </DialogHeader>

        <ProfileContextBanner />

        <Textarea
          placeholder="Contexte optionnel : fatigue, blessure, contrainte d'agenda…"
          rows={2}
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
        />

        <Button className="w-fit" disabled={guardDisabled || isAdapting} onClick={handleAdapt}>
          {renderAdaptButtonContent(isAdapting, offline, offlineLabel, Boolean(result))}
        </Button>

        {isAdapting && <CoachGenerationProgressPanel itemNoun="ajustement" progress={progress} />}

        {adapt.error && (
          <p className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {adapt.error.message}
          </p>
        )}

        {result ? (
          <PlanAdapterResults
            applied={applied}
            applyError={applyError}
            gateResults={gateResults}
            guardDisabled={guardDisabled}
            isApplying={isApplying}
            offline={offline}
            offlineLabel={offlineLabel}
            result={result}
            selected={selected}
            sessionsById={sessionsById}
            toggle={toggle}
            onApply={handleApply}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
