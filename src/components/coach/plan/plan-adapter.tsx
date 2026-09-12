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
import { useGoals } from '@/hooks/use-goals';
import type { GateSessionResult } from '@/lib/plan-gate/types';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { warmCoachContext } from '@/lib/coach/warm-coach-context';
import { AdaptChangeRow } from '@/components/coach/plan/adapt-change-row';
import { buildAdaptBatchOps } from '@/components/coach/plan/plan-adapter-apply';
import { PlanAdaptAppliedPanel } from '@/components/plan/adapt-applied-panel';
import { recordAdaptAppliedAck, type AdaptAppliedAck } from '@/lib/plan/adapt-applied-ack';
<<<<<<< HEAD
import { recordCoachingAdvancementEntry } from '@/lib/plan/coaching-advancement-ledger';
=======
import { isHabitPlanFocus } from '@/lib/today/rich/habit-coaching-signal';
>>>>>>> origin/cursor/habitudes-plan-36c4
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

function planAdapterDescription(initialFocus?: string): string {
  if (initialFocus && isHabitPlanFocus(initialFocus)) {
    return 'Proposition préparée depuis ton journal. Vérifie le contexte, lance les propositions, puis valide ce que tu gardes — rien n’est appliqué sans toi.';
  }
  if (initialFocus) {
    return 'Proposition préparée depuis ton Twin après feedback. Vérifie le contexte, lance les propositions, puis valide ce que tu gardes — rien n’est appliqué sans toi.';
  }
  return 'Le coach analyse ce que tu as réellement fait et propose des modifications sur tes séances déjà planifiées (14 prochains jours), sans tout recréer.';
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
  const [confirmedAck, setConfirmedAck] = useState<AdaptAppliedAck | null>(null);

  useEffect(() => {
    warmCoachContext({ includeScenario: true });
  }, []);

  const [progress, setProgress] = useState<CoachGenerationProgress | null>(null);
  const adapt = useAdaptPlan(setProgress);
  const plannedQuery = usePlannedSessions();
  const planQuery = useTrainingPlan();
  const goalsQuery = useGoals();
  const { applyBatch } = usePlannedSessionMutations();
  const result = adapt.data;
  const defaultGoalId = planQuery.data?.goalId ?? null;

  const goalLabel = useMemo(() => {
    const goalId = planQuery.data?.goalId;
    if (!goalId) {
      return null;
    }
    return goalsQuery.data?.find((goal) => goal.id === goalId)?.title ?? null;
  }, [goalsQuery.data, planQuery.data?.goalId]);

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
    setConfirmedAck(null);
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
      onSuccess: () => {
        const appliedAt = new Date();
        setConfirmedAck(
          recordAdaptAppliedAck({
            goalLabel,
            changeCount: ops.length,
            now: appliedAt,
          }),
        );
        recordCoachingAdvancementEntry({
          goalLabel,
          changeCount: ops.length,
          now: appliedAt,
        });
      },
      onError: (err) => {
        setApplied(false);
        setApplyError(err instanceof Error ? err.message : 'Erreur');
      },
    });
  }

  const isAdapting = adapt.isPending;
  const isApplying = applyBatch.isPending;

  const body = confirmedAck ? (
    <PlanAdaptAppliedPanel ack={confirmedAck} dismissLabel="Voir le planning" onDismiss={onClose} />
  ) : (
    <PlanAdapterEditor
      adaptError={adapt.error}
      applied={applied}
      applyError={applyError}
      focus={focus}
      gateResults={gateResults}
      guardDisabled={guardDisabled}
      isAdapting={isAdapting}
      isApplying={isApplying}
      offline={offline}
      offlineLabel={offlineLabel}
      progress={progress}
      result={result}
      selected={selected}
      sessionsById={sessionsById}
      onAdapt={handleAdapt}
      onApply={handleApply}
      onClose={onClose}
      onFocusChange={setFocus}
      onToggle={toggle}
    />
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListRestart className="text-primary size-4" />
            Ajuster le planning
          </DialogTitle>
          <DialogDescription>{planAdapterDescription(initialFocus)}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}

function PlanAdapterEditor({
  adaptError,
  applied,
  applyError,
  focus,
  gateResults,
  guardDisabled,
  isAdapting,
  isApplying,
  offline,
  offlineLabel,
  onAdapt,
  onApply,
  onClose,
  onFocusChange,
  onToggle,
  progress,
  result,
  selected,
  sessionsById,
}: {
  adaptError: Error | null;
  applied: boolean;
  applyError: string | null;
  focus: string;
  gateResults: Map<string, GateSessionResult>;
  guardDisabled: boolean;
  isAdapting: boolean;
  isApplying: boolean;
  offline: boolean;
  offlineLabel: string;
  onAdapt: () => void;
  onApply: () => void;
  onClose: () => void;
  onFocusChange: (value: string) => void;
  onToggle: (i: number) => void;
  progress: CoachGenerationProgress | null;
  result: AdaptPlanResult | undefined;
  selected: Set<number>;
  sessionsById: Map<string, ClientPlannedSession>;
}) {
  return (
    <>
      <ProfileContextBanner />
      <Textarea
        placeholder="Contexte optionnel : fatigue, blessure, contrainte d'agenda…"
        rows={2}
        value={focus}
        onChange={(e) => onFocusChange(e.target.value)}
      />
      <Button className="w-fit" disabled={guardDisabled || isAdapting} onClick={onAdapt}>
        {renderAdaptButtonContent(isAdapting, offline, offlineLabel, Boolean(result))}
      </Button>
      {isAdapting ? (
        <CoachGenerationProgressPanel itemNoun="ajustement" progress={progress} />
      ) : null}
      {adaptError ? (
        <p className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          {adaptError.message}
        </p>
      ) : null}
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
          toggle={onToggle}
          onApply={onApply}
          onClose={onClose}
        />
      ) : null}
    </>
  );
}
