'use client';

import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, Loader2, Wand2, WifiOff } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { activityTypeLabels } from '@/lib/format';
import { intensityLabels } from '@/lib/planned-session/sessions';
import { cn } from '@/lib/utils';
import { useAdaptPlan, type AdaptChange, type AdaptPlanResult } from '@/hooks/use-coach';
import {
  usePlannedSessions,
  usePlannedSessionMutations,
  type PlannedSessionBatchOp,
  type PlannedSessionPayload,
} from '@/hooks/use-data';
import type { GateSessionResult } from '@/lib/plan-gate/types';
import { GateStatusBadge, GateFindingsList } from '@/components/coach/plan/gate-status-badge';
import { AdaptationTrigger } from '@/components/coach/plan/adaptation-trigger';
import { useOnlineStatus } from '@/hooks/use-online-status';

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

const ACTION_LABEL: Record<AdaptChange['action'], string> = {
  MODIFY: 'Modifier',
  REMOVE: 'Supprimer',
  ADD: 'Ajouter',
};

const ACTION_STYLE: Record<AdaptChange['action'], string> = {
  MODIFY: 'bg-signal-caution/15 text-signal-caution',
  REMOVE: 'bg-signal-risk/15 text-signal-risk',
  ADD: 'bg-primary/15 text-primary',
};

function formatChangeDate(
  date: string | null | undefined,
  existing: ClientPlannedSession | null | undefined,
): string {
  if (date) {
    return format(parseISO(date), 'EEE d MMM', { locale: fr });
  }
  if (existing?.date) {
    return format(existing.date, 'EEE d MMM', { locale: fr });
  }
  return '';
}

function renderApplyButtonContent(applied: boolean, isApplying: boolean, online: boolean) {
  if (!online) {
    return (
      <>
        <WifiOff className="size-4" /> Hors ligne
      </>
    );
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

  const adapt = useAdaptPlan();
  const plannedQuery = usePlannedSessions();
  const { applyBatch } = usePlannedSessionMutations();
  const result = adapt.data;

  const sessionsById = useMemo(() => {
    const map = new Map<string, ClientPlannedSession>();
    for (const s of plannedQuery.data ?? []) map.set(s.id, s);
    return map;
  }, [plannedQuery.data]);

  const gateResults = useMemo(() => (result ? buildGateResultLookup(result) : new Map()), [result]);

  async function handleAdapt() {
    setApplyError(null);
    setApplied(false);
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
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function handleApply() {
    if (!result) return;
    setApplyError(null);
    const changes = result.changes.filter((_, i) => selected.has(i));
    const ops: PlannedSessionBatchOp[] = [];

    for (const c of changes) {
      if (c.action === 'REMOVE' && c.sessionId) {
        ops.push({ op: 'remove', id: c.sessionId });
        continue;
      }
      if (c.action === 'MODIFY' && c.sessionId) {
        const data: Partial<PlannedSessionPayload> = {};
        if (c.type) data.type = c.type;
        if (c.intensity) data.intensity = c.intensity;
        if (c.title != null) data.title = c.title;
        if (c.description != null) data.description = c.description;
        if (c.durationMin != null) data.durationMin = c.durationMin;
        if (c.load != null) data.load = c.load;
        if (c.date) data.date = new Date(`${c.date}T12:00:00`);
        data.decisionId = c.decisionId;
        ops.push({ op: 'update', id: c.sessionId, data });
        continue;
      }
      if (c.action === 'ADD' && c.date && c.type) {
        ops.push({
          op: 'create',
          payload: {
            type: c.type,
            date: new Date(`${c.date}T12:00:00`),
            title: c.title,
            description: c.description,
            durationMin: c.durationMin,
            load: c.load,
            intensity: c.intensity,
            decisionId: c.decisionId,
          },
        });
      }
    }

    if (ops.length === 0) return;

    // Instant: one cache patch + one toast in applyBatch; close without awaiting network.
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
  const online = useOnlineStatus();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="text-primary size-4" />
            Ajuster mon planning
          </DialogTitle>
          <DialogDescription>
            Le coach analyse ce que tu as réellement fait et propose des modifications sur tes
            séances déjà planifiées (14 prochains jours) — sans tout recréer.
          </DialogDescription>
        </DialogHeader>

        <ProfileContextBanner />

        <Textarea
          placeholder="Contexte optionnel : fatigue, blessure, contrainte d'agenda…"
          rows={2}
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
        />

        <Button className="w-fit" disabled={isAdapting} onClick={handleAdapt}>
          {isAdapting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Analyse…
            </>
          ) : (
            <>
              <Wand2 className="size-4" />
              {result ? 'Régénérer les propositions' : 'Proposer des ajustements'}
            </>
          )}
        </Button>

        {adapt.error && (
          <p className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {adapt.error.message}
          </p>
        )}

        {result && (
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
              {result.changes.map((c, i) => {
                const existing = c.sessionId ? sessionsById.get(c.sessionId) : null;
                const dateStr = formatChangeDate(c.date, existing);
                const fields = [
                  c.type ? activityTypeLabels[c.type] : null,
                  c.intensity ? intensityLabels[c.intensity] : null,
                  c.durationMin != null ? `${c.durationMin} min` : null,
                  c.load != null ? `${c.load} TSS` : null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                const gateResult = gateResults.get(gateKey(c));
                const rejected = gateResult?.status === 'REJECTED';
                return (
                  <button
                    key={i}
                    disabled={rejected}
                    type="button"
                    className={cn(
                      'flex w-full gap-3 rounded-lg border p-3 text-left transition-colors',
                      rejected &&
                        'border-signal-risk/30 bg-signal-risk/5 cursor-not-allowed opacity-80',
                      !rejected && selected.has(i)
                        ? 'border-primary/40 bg-primary/5'
                        : !rejected &&
                            'border-analysis-border/60 bg-analysis-surface-alt/50 opacity-60 hover:opacity-100',
                    )}
                    onClick={rejected ? undefined : () => toggle(i)}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border',
                        selected.has(i) && !rejected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border',
                      )}
                    >
                      {selected.has(i) && !rejected && <Check className="size-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                            ACTION_STYLE[c.action],
                          )}
                        >
                          {ACTION_LABEL[c.action]}
                        </span>
                        {dateStr && (
                          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                            {dateStr}
                          </span>
                        )}
                        {(c.title ?? existing?.title) && (
                          <span className="text-sm font-medium">{c.title ?? existing?.title}</span>
                        )}
                        {gateResult && <GateStatusBadge status={gateResult.status} />}
                      </div>
                      {fields && <p className="text-muted-foreground mt-1 text-xs">{fields}</p>}
                      {c.description && (
                        <p className="text-muted-foreground mt-0.5 text-xs">{c.description}</p>
                      )}
                      <p className="text-muted-foreground/80 mt-1 text-xs italic">→ {c.reason}</p>
                      {gateResult && <GateFindingsList result={gateResult} />}
                      {c.action === 'MODIFY' && c.sessionId && (
                        <AdaptationTrigger gateResult={gateResult} sessionId={c.sessionId} />
                      )}
                    </div>
                  </button>
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
                    disabled={!online || isApplying || selected.size === 0 || applied}
                    onClick={handleApply}
                  >
                    {renderApplyButtonContent(applied, isApplying, online)}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
