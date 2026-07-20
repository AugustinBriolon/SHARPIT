'use client';

import { format, parseISO, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, Loader2, Sparkles, WifiOff } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { activityTypeLabels } from '@/lib/format';
import { formatPlannedDuration, intensityAccent, intensityLabels } from '@/lib/sessions';
import { cn } from '@/lib/utils';
import { phaseLabels } from '@/lib/periodization';
import { useCoachPlan, type GeneratedSession } from '@/hooks/use-coach';
import { useGoals, usePlannedSessionMutations, useTrainingPlan } from '@/hooks/use-data';
import { useOnlineStatus } from '@/hooks/use-online-status';
import type { GateSessionResult } from '@/lib/plan-gate/types';
import { GateStatusBadge, GateFindingsList } from '@/components/coach/gate-status-badge';

const WEEK_OPTS = { weekStartsOn: 1 as const };

const DAYS_OPTIONS = [
  { value: '7', label: '1 semaine' },
  { value: '14', label: '2 semaines' },
  { value: '3', label: '3 jours' },
];

const NO_GOAL = 'none';

function renderInsertButtonContent(online: boolean) {
  if (!online) {
    return (
      <>
        <WifiOff className="size-4" />
        Hors ligne
      </>
    );
  }
  return 'Ajouter au planning';
}

interface PlanGeneratorProps {
  startDate?: string; // yyyy-MM-dd
  onClose: () => void;
}

export function PlanGenerator({ startDate, onClose }: PlanGeneratorProps) {
  const [days, setDays] = useState('7');
  const [focus, setFocus] = useState('');
  const [goalId, setGoalId] = useState<string>(NO_GOAL);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const coachPlan = useCoachPlan();
  const { createMany } = usePlannedSessionMutations();
  const goalsQuery = useGoals();
  const planQuery = useTrainingPlan();
  const plan = coachPlan.data;

  const planWeek = useMemo(() => {
    const active = planQuery.data;
    if (!active?.weeks?.length) return null;
    const blockStart = startDate ? parseISO(startDate) : new Date();
    const ws = format(startOfWeek(blockStart, WEEK_OPTS), 'yyyy-MM-dd');
    return active.weeks.find((w) => format(new Date(w.weekStart), 'yyyy-MM-dd') === ws);
  }, [planQuery.data, startDate]);

  // Objectifs datés (courses à venir) sélectionnables comme cible du bloc.
  const datedGoals = (goalsQuery.data ?? [])
    .filter((g) => !g.achieved && g.targetDate)
    .filter((g) => new Date(g.targetDate as unknown as string) >= new Date());

  async function handleGenerate() {
    const result = await coachPlan.mutateAsync({
      days: Number(days),
      focus: focus.trim() || undefined,
      startDate,
      goalId: goalId === NO_GOAL ? null : goalId,
      targetLoad: planWeek?.targetLoad ?? null,
      planPhase: planWeek ? phaseLabels[planWeek.phase] : null,
      planFocus: planWeek?.focus ?? null,
    });
    // Pre-select everything except sessions the Gate rejected outright.
    setSelected(
      new Set(
        result.sessions
          .map((_, i) => i)
          .filter((i) => result.gate.sessions[i]?.status !== 'REJECTED'),
      ),
    );
  }

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  /** Instant UX: optimistic batch + close immediately; toast comes from the mutation. */
  function handleInsert() {
    if (!plan || selected.size === 0) return;
    const payloads = plan.sessions
      .filter((_, i) => selected.has(i))
      .map((s) => ({
        type: s.type,
        date: new Date(`${s.date}T12:00:00`),
        startTime: s.startTime,
        title: s.title,
        description: s.description,
        durationMin: s.durationMin,
        load: s.load,
        intensity: s.intensity,
        goalId: goalId === NO_GOAL ? null : goalId,
        decisionId: s.decisionId,
      }));
    createMany.mutate(payloads);
    onClose();
  }

  const isGenerating = coachPlan.isPending;
  const online = useOnlineStatus();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary size-4" />
            Remplir ma semaine
          </DialogTitle>
          <DialogDescription>
            Le coach propose de nouvelles séances à ajouter au calendrier, selon ta forme et ton
            objectif. Tu valides avant insertion — idéal quand la semaine est vide ou incomplète.
          </DialogDescription>
        </DialogHeader>

        <ProfileContextBanner />

        <div className="flex min-w-0 flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 space-y-2 sm:flex-none">
            <Label>Durée du bloc</Label>
            <Select value={days} onValueChange={(v) => setDays(v ?? '7')}>
              <SelectTrigger className="w-full min-w-0 sm:w-40">
                <SelectValue>{DAYS_OPTIONS.find((o) => o.value === days)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DAYS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 flex-1 space-y-2 sm:flex-none">
            <Label>Objectif ciblé</Label>
            <Select value={goalId} onValueChange={(v) => setGoalId(v ?? NO_GOAL)}>
              <SelectTrigger className="w-full min-w-0 sm:w-56">
                <SelectValue>
                  {goalId === NO_GOAL
                    ? 'Aucun (forme générale)'
                    : (datedGoals.find((g) => g.id === goalId)?.title ?? 'Aucun')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_GOAL}>Aucun (forme générale)</SelectItem>
                {datedGoals.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.title}
                    {g.targetDate
                      ? ` — ${format(new Date(g.targetDate as unknown as string), 'd MMM yyyy', { locale: fr })}`
                      : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="mb-2" disabled={isGenerating} onClick={handleGenerate}>
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Génération…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                {plan ? 'Régénérer' : 'Générer'}
              </>
            )}
          </Button>
        </div>

        {planWeek && (
          <p className="text-muted-foreground analysis-panel-alt rounded-analysis p-2 text-xs">
            Macro-plan : {phaseLabels[planWeek.phase]} — cible{' '}
            <span className="text-foreground font-mono font-medium">{planWeek.targetLoad} TSS</span>
            {planWeek.isDeload ? ' (semaine de récup)' : ''}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="focus">Demande spécifique (optionnel)</Label>
          <Textarea
            id="focus"
            placeholder="Ex : je veux deux grosses séances vélo, repos le vendredi, je pars en voyage samedi…"
            rows={2}
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
          />
        </div>

        {coachPlan.error && (
          <p className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {coachPlan.error.message}
          </p>
        )}

        {plan && (
          <div className="space-y-3">
            <p className="border-primary/20 bg-primary/5 text-muted-foreground rounded-md border p-3 text-sm">
              {plan.summary}
            </p>

            <div className="space-y-2">
              {plan.sessions.map((s, i) => (
                <SessionRow
                  key={i}
                  gateResult={plan.gate.sessions[i]}
                  selected={selected.has(i)}
                  session={s}
                  onToggle={() => toggle(i)}
                />
              ))}
            </div>

            <div className="border-border/60 flex items-center justify-between gap-2 border-t pt-3">
              <span className="text-muted-foreground text-xs">
                {selected.size} séance(s) sélectionnée(s)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Fermer
                </Button>
                <Button disabled={!online || selected.size === 0} onClick={handleInsert}>
                  {renderInsertButtonContent(online)}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SessionRow({
  session,
  selected,
  onToggle,
  gateResult,
}: {
  session: GeneratedSession;
  selected: boolean;
  onToggle: () => void;
  gateResult?: GateSessionResult;
}) {
  const accent = intensityAccent[session.intensity];
  const date = parseISO(session.date);
  const rejected = gateResult?.status === 'REJECTED';

  return (
    <button
      disabled={rejected}
      type="button"
      className={cn(
        'flex w-full gap-3 rounded-lg border p-3 text-left transition-colors',
        rejected && 'border-signal-risk/30 bg-signal-risk/5 cursor-not-allowed opacity-80',
        !rejected && selected
          ? 'border-primary/40 bg-primary/5'
          : !rejected &&
              'border-analysis-border/60 bg-analysis-surface-alt/50 opacity-60 hover:opacity-100',
      )}
      onClick={rejected ? undefined : onToggle}
    >
      <span
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border',
          selected && !rejected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border',
        )}
      >
        {selected && !rejected && <Check className="size-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {format(date, 'EEE d MMM', { locale: fr })}
          </span>
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: `${accent}22`, color: accent }}
          >
            {intensityLabels[session.intensity]}
          </span>
          <span className="text-muted-foreground text-xs">
            {session.startTime ? `${session.startTime} · ` : ''}
            {activityTypeLabels[session.type]} · {formatPlannedDuration(session.durationMin)} ·{' '}
            {session.load} TSS
          </span>
          {gateResult && <GateStatusBadge status={gateResult.status} />}
        </div>
        <p className="mt-1 text-sm font-medium">{session.title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{session.description}</p>
        {session.rationale && (
          <p className="text-muted-foreground/80 mt-1 text-xs italic">→ {session.rationale}</p>
        )}
        {gateResult && <GateFindingsList result={gateResult} />}
      </div>
    </button>
  );
}
