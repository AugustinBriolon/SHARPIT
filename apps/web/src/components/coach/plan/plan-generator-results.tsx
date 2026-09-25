'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PlanGeneratorSessionRow } from '@/components/coach/plan/plan-generator-session-row';
import { Button } from '@/components/ui/button';
import type { ClientGoal } from '@/lib/query/types';
import { phaseLabels } from '@/lib/training/periodization';

export function PlanGeneratorResults({
  datedGoals: _datedGoals,
  goalId: _goalId,
  offline,
  offlineLabel,
  onClose,
  onInsert,
  onToggle,
  plan,
  planWeek: _planWeek,
  selected,
  guardDisabled,
}: {
  datedGoals: ClientGoal[];
  goalId: string;
  offline: boolean;
  offlineLabel: string;
  onClose: () => void;
  onInsert: () => void;
  onToggle: (index: number) => void;
  plan:
    NonNullable<ReturnType<typeof import('@/hooks/use-coach').useCoachPlan>['data']> | undefined;
  planWeek: { phase: keyof typeof phaseLabels; targetLoad: number; isDeload: boolean } | null;
  selected: Set<number>;
  guardDisabled: boolean;
  /** Kept for call-site stability — progress UI lives only in PlanGenerator. */
  isGenerating?: boolean;
  progress?: unknown;
}) {
  if (!plan) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="border-primary/20 bg-primary/5 text-muted-foreground rounded-md border p-3 text-sm">
        {plan.summary}
      </p>

      <div className="space-y-2">
        {plan.sessions.map((session, index) => (
          <PlanGeneratorSessionRow
            key={index}
            gateResult={plan.gate.sessions[index]}
            selected={selected.has(index)}
            session={session}
            onToggle={() => onToggle(index)}
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
          <Button disabled={guardDisabled || selected.size === 0} onClick={onInsert}>
            {offline ? offlineLabel : 'Ajouter au planning'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PlanGeneratorMacroHint({
  datedGoals,
  goalId,
  planWeek,
}: {
  datedGoals: ClientGoal[];
  goalId: string;
  planWeek: { phase: keyof typeof phaseLabels; targetLoad: number; isDeload: boolean } | null;
}) {
  if (!planWeek) {
    return null;
  }

  const goalTitle = datedGoals.find((goal) => goal.id === goalId)?.title;
  return (
    <p className="text-muted-foreground analysis-panel-alt rounded-analysis p-2 text-xs">
      Macro-plan : {phaseLabels[planWeek.phase]} · cible{' '}
      <span className="text-foreground font-mono font-medium">{planWeek.targetLoad} TSS</span>
      {planWeek.isDeload ? ' (semaine de récup)' : ''}
      {goalId !== 'none' && goalTitle ? ` · objectif ${goalTitle}` : ''}
    </p>
  );
}

export function formatGoalOptionLabel(goal: ClientGoal) {
  if (!goal.targetDate) {
    return goal.title;
  }
  return `${goal.title} · ${format(new Date(goal.targetDate as unknown as string), 'd MMM yyyy', { locale: fr })}`;
}
