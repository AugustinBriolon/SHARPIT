'use client';

import { CalendarPlus, Loader2 } from 'lucide-react';
import { ProfileContextBanner } from '@/components/profile/profile-context-banner';
import {
  formatGoalOptionLabel,
  PlanGeneratorMacroHint,
  PlanGeneratorResults,
} from '@/components/coach/plan/plan-generator-results';
import { usePlanGenerator } from '@/components/coach/plan/use-plan-generator';
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
import { CoachGenerationProgressPanel } from '@/components/coach/plan/generation-progress';

const DAYS_OPTIONS = [
  { value: '7', label: '1 semaine' },
  { value: '14', label: '2 semaines' },
  { value: '3', label: '3 jours' },
];

const NO_GOAL = 'none';

function renderGenerateButtonContent(
  isGenerating: boolean,
  offline: boolean,
  offlineLabel: string,
  hasPlan: boolean,
) {
  if (isGenerating) {
    return (
      <>
        <Loader2 className="size-4 animate-spin" />
        Génération…
      </>
    );
  }
  if (offline) {
    return offlineLabel;
  }
  return (
    <>
      <CalendarPlus className="size-4" />
      {hasPlan ? 'Régénérer' : 'Générer'}
    </>
  );
}

interface PlanGeneratorProps {
  startDate?: string;
  onClose: () => void;
}

export function PlanGenerator({ startDate, onClose }: PlanGeneratorProps) {
  const generator = usePlanGenerator(startDate, onClose);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="text-primary size-4" />
            Remplir ma semaine
          </DialogTitle>
          <DialogDescription>
            Le coach propose de nouvelles séances à ajouter au calendrier, selon ta forme et ton
            objectif. Tu valides avant insertion, surtout si la semaine est vide ou incomplète.
          </DialogDescription>
        </DialogHeader>

        <ProfileContextBanner />

        <div className="flex min-w-0 flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 space-y-2 sm:flex-none">
            <Label>Durée du bloc</Label>
            <Select value={generator.days} onValueChange={(v) => generator.setDays(v ?? '7')}>
              <SelectTrigger className="w-full min-w-0 sm:w-40">
                <SelectValue>
                  {DAYS_OPTIONS.find((o) => o.value === generator.days)?.label}
                </SelectValue>
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
            <Select
              value={generator.goalId}
              onValueChange={(v) => generator.setGoalId(v ?? NO_GOAL)}
            >
              <SelectTrigger className="w-full min-w-0 sm:w-56">
                <SelectValue>
                  {generator.goalId === NO_GOAL
                    ? 'Aucun (forme générale)'
                    : (generator.datedGoals.find((g) => g.id === generator.goalId)?.title ??
                      'Aucun')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_GOAL}>Aucun (forme générale)</SelectItem>
                {generator.datedGoals.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {formatGoalOptionLabel(g)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="mb-2"
            disabled={generator.guardDisabled || generator.isGenerating}
            onClick={() => void generator.handleGenerate()}
          >
            {renderGenerateButtonContent(
              generator.isGenerating,
              generator.offline,
              generator.offlineLabel,
              Boolean(generator.plan),
            )}
          </Button>
        </div>

        <PlanGeneratorMacroHint
          datedGoals={generator.datedGoals}
          goalId={generator.goalId}
          planWeek={generator.planWeek}
        />

        <div className="space-y-2">
          <Label htmlFor="focus">Demande spécifique (optionnel)</Label>
          <Textarea
            id="focus"
            placeholder="Ex : je veux deux grosses séances vélo, repos le vendredi, je pars en voyage samedi…"
            rows={2}
            value={generator.focus}
            onChange={(e) => generator.setFocus(e.target.value)}
          />
        </div>

        {generator.isGenerating ? (
          <CoachGenerationProgressPanel itemNoun="séance" progress={generator.progress} />
        ) : null}

        {generator.coachPlan.error ? (
          <p className="bg-destructive/10 text-destructive rounded-md p-3 text-sm" role="alert">
            {generator.coachPlan.error.message}
          </p>
        ) : null}

        <PlanGeneratorResults
          datedGoals={generator.datedGoals}
          goalId={generator.goalId}
          guardDisabled={generator.guardDisabled}
          isGenerating={generator.isGenerating}
          offline={generator.offline}
          offlineLabel={generator.offlineLabel}
          plan={generator.plan}
          planWeek={generator.planWeek}
          progress={generator.progress}
          selected={generator.selected}
          onClose={onClose}
          onInsert={generator.handleInsert}
          onToggle={generator.toggle}
        />
      </DialogContent>
    </Dialog>
  );
}
