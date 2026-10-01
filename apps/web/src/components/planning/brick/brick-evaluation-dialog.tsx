'use client';

import { useEffect, useState } from 'react';
import { Button } from '@sharpit/ui/components/ui/button';
import { NavArrowLeft, NavArrowRight } from '@/components/icons/nav-arrows';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScalePicker, StepDots } from '@/components/ui/instruments/scale-picker';
import {
  FEELING_OPTIONS,
  RPE_OPTIONS,
  TRANSITION_OPTIONS,
} from '@/components/ui/instruments/session-scales';
import { Textarea } from '@/components/ui/textarea';

/**
 * The whole brick, rated as one effort — same instrument as the session
 * feeling (ADR-059). Each leg keeps its own RPE; this asks about the chain.
 * Every question can be skipped: an unanswered scale stays empty, never zero.
 */

export type BrickEvaluationDraft = {
  feeling: string | null;
  rpe: number | null;
  transitionRating: number | null;
  notes: string;
};

const STEP_TITLES = ['Ressenti', 'Effort global', 'Transitions', 'Notes'] as const;
const TOTAL_STEPS = STEP_TITLES.length;

function EvaluationStep({
  step,
  draft,
  onChange,
}: {
  step: number;
  draft: BrickEvaluationDraft;
  onChange: (patch: Partial<BrickEvaluationDraft>) => void;
}) {
  switch (step) {
    case 0:
      return (
        <ScalePicker
          hint="Comment as-tu vécu l’enchaînement dans son ensemble ?"
          options={FEELING_OPTIONS}
          title="Ressenti global"
          value={draft.feeling}
          onChange={(feeling) => onChange({ feeling })}
        />
      );
    case 1:
      return (
        <ScalePicker
          footnote="Le brick entier, transitions comprises — pas chaque sport."
          hint="Quel effort le brick t’a demandé ?"
          options={RPE_OPTIONS}
          title="Effort perçu (RPE)"
          value={draft.rpe}
          onChange={(rpe) => onChange({ rpe })}
        />
      );
    case 2:
      return (
        <ScalePicker
          hint="Comment se sont passés les changements de sport ?"
          options={TRANSITION_OPTIONS}
          title="Transitions"
          value={draft.transitionRating}
          onChange={(transitionRating) => onChange({ transitionRating })}
        />
      );
    default:
      return (
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Notes</span>
          <Textarea
            maxLength={2000}
            placeholder="Jambes en sortie de vélo, ravitaillement, matériel…"
            rows={5}
            value={draft.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
          />
        </label>
      );
  }
}

function EvaluationFooter({
  step,
  isSaving,
  onBack,
  onNext,
  onSave,
}: {
  step: number;
  isSaving: boolean;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
}) {
  const isLastStep = step === TOTAL_STEPS - 1;
  return (
    <div className="border-border/60 flex shrink-0 items-center justify-between border-t px-5 py-3">
      <Button
        className="h-11 px-3 text-xs lg:h-8"
        disabled={step === 0}
        type="button"
        variant="ghost"
        onClick={onBack}
      >
        <NavArrowLeft className="size-3.5" aria-hidden />
        Retour
      </Button>
      {isLastStep ? (
        <Button
          className="h-11 px-4 text-xs lg:h-8"
          disabled={isSaving}
          type="button"
          variant="highlight"
          onClick={onSave}
        >
          Enregistrer
        </Button>
      ) : (
        <Button className="h-11 px-3 text-xs lg:h-8" type="button" variant="ghost" onClick={onNext}>
          {STEP_TITLES[step + 1]}
          <NavArrowRight className="size-3.5" aria-hidden />
        </Button>
      )}
    </div>
  );
}

export function BrickEvaluationDialog({
  open,
  draft,
  isSaving,
  onOpenChange,
  onDraftChange,
  onSave,
}: {
  open: boolean;
  draft: BrickEvaluationDraft;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (patch: Partial<BrickEvaluationDraft>) => void;
  onSave: () => void;
}) {
  const [step, setStep] = useState(0);

  // Reopening must start on the first question, never where the last pass left off.
  useEffect(() => {
    if (!open) {
      setStep(0);
    }
  }, [open]);

  const next = () => setStep((previous) => Math.min(previous + 1, TOTAL_STEPS - 1));

  // A tap on a scale is the answer — move on rather than ask for a confirming tap.
  function handleChange(patch: Partial<BrickEvaluationDraft>) {
    onDraftChange(patch);
    if (!('notes' in patch)) {
      next();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,36rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-sm">
        <DialogHeader className="shrink-0 border-b px-5 py-3 pr-12 text-left">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="font-heading text-base">Évaluation du brick</DialogTitle>
            <StepDots current={step} total={TOTAL_STEPS} />
          </div>
          <DialogDescription className="sr-only">
            Ton vécu de l’enchaînement complet, transitions comprises.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col justify-center px-5 py-6">
          <EvaluationStep draft={draft} step={step} onChange={handleChange} />
        </div>
        <EvaluationFooter
          isSaving={isSaving}
          step={step}
          onBack={() => setStep((previous) => Math.max(previous - 1, 0))}
          onNext={next}
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  );
}
