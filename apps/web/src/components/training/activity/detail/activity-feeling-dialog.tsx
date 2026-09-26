'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { NavArrowLeft, NavArrowRight } from '@/components/icons/nav-arrows';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScalePicker, StepDots, type ScaleOption } from '@/components/ui/instruments/scale-picker';
import { ACTIVITY_FEELING_SCALE } from '@sharpit/app/lib/activity/feeling/activity-feeling-scale';

/**
 * Session feeling — the same instrument as « Ressenti du matin »: one question
 * per step, ordinal tiles, a hint that reads back what the choice means.
 *
 * Picking an answer advances on its own. A tap is the answer; asking for a
 * second tap on « suivant » to confirm it is a step that carries no decision.
 */

const FEELING_OPTIONS: readonly ScaleOption<string>[] = ACTIVITY_FEELING_SCALE.map((option) => ({
  value: option.value,
  label: option.label,
  hint: option.hint,
}));

/** Foster CR10 anchors — the number alone tells the athlete nothing. */
const RPE_LABELS = [
  'Très facile',
  'Facile',
  'Modéré',
  'Assez dur',
  'Dur',
  'Plus dur',
  'Très dur',
  'Très dur soutenu',
  'Proche du max',
  'Maximal',
];

const RPE_OPTIONS: readonly ScaleOption<number>[] = RPE_LABELS.map((label, index) => ({
  value: index + 1,
  label,
  hint: `${index + 1}/10 · ${label}.`,
}));

const TOTAL_STEPS = 2;

function FeelingFooterAction({
  isLastStep,
  canAdvance,
  canSave,
  onNext,
  onSave,
}: {
  isLastStep: boolean;
  canAdvance: boolean;
  canSave: boolean;
  onNext: () => void;
  onSave: () => void;
}) {
  if (isLastStep) {
    return (
      <Button
        className="h-11 px-4 text-xs lg:h-8"
        disabled={!canSave}
        type="button"
        variant="highlight"
        onClick={onSave}
      >
        Enregistrer
      </Button>
    );
  }

  return (
    <Button
      className="h-11 px-3 text-xs lg:h-8"
      disabled={!canAdvance}
      type="button"
      variant="ghost"
      onClick={onNext}
    >
      Effort perçu
      <NavArrowRight className="size-3.5" aria-hidden />
    </Button>
  );
}

function FeelingDialogFooter({
  step,
  canAdvance,
  canSave,
  onBack,
  onNext,
  onSave,
}: {
  step: number;
  canAdvance: boolean;
  canSave: boolean;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
}) {
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
      <FeelingFooterAction
        canAdvance={canAdvance}
        canSave={canSave}
        isLastStep={step === TOTAL_STEPS - 1}
        onNext={onNext}
        onSave={onSave}
      />
    </div>
  );
}

type ActivityFeelingDialogProps = {
  activityId: string;
  open: boolean;
  /** Null until the athlete picks one — never a default shown as chosen. */
  rpe: number | null;
  feeling: string;
  feelingError: string | null;
  onOpenChange: (open: boolean) => void;
  onRpeChange: (rpe: number) => void;
  onFeelingChange: (feeling: string) => void;
  onSave: () => void;
};

function FeelingDialogHeader({ step }: { step: number }) {
  return (
    <DialogHeader className="shrink-0 border-b px-5 py-3 pr-12 text-left">
      <div className="flex items-center justify-between gap-3">
        <DialogTitle className="font-heading text-base">Ressenti de la séance</DialogTitle>
        <StepDots current={step} total={TOTAL_STEPS} />
      </div>
      <DialogDescription className="sr-only">
        Ton vécu nourrit la charge perçue (Foster) et la lecture de récupération.
      </DialogDescription>
    </DialogHeader>
  );
}

function FeelingDialogBody({
  step,
  rpe,
  feeling,
  feelingError,
  onRpeChange,
  onFeelingChange,
}: Pick<
  ActivityFeelingDialogProps,
  'rpe' | 'feeling' | 'feelingError' | 'onRpeChange' | 'onFeelingChange'
> & { step: number }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center px-5 py-6">
      {step === 0 ? (
        <ScalePicker
          footnote="Ton vécu nourrit la charge perçue (Foster) et la lecture de récupération."
          hint="Comment as-tu vécu cette séance dans l’ensemble ?"
          options={FEELING_OPTIONS}
          title="Ressenti global"
          value={feeling || null}
          onChange={onFeelingChange}
        />
      ) : (
        <ScalePicker
          footnote="1 = très facile · 10 = effort maximal sur la séance."
          hint="Quel effort la séance t’a demandé ?"
          options={RPE_OPTIONS}
          title="Effort perçu (RPE)"
          value={rpe}
          onChange={onRpeChange}
        />
      )}

      {feelingError ? (
        <p aria-live="assertive" className="text-destructive mt-4 text-center text-xs" role="alert">
          {feelingError}
        </p>
      ) : null}
    </div>
  );
}

export function ActivityFeelingDialog(props: ActivityFeelingDialogProps) {
  const { open, rpe, feeling, feelingError, onOpenChange, onRpeChange, onFeelingChange, onSave } =
    props;
  const [step, setStep] = useState(0);

  // Reopening must start on the first question, never where the last pass left off.
  useEffect(() => {
    if (!open) {
      setStep(0);
    }
  }, [open]);

  // The tap is the answer — move to the next question rather than asking for a
  // second tap to confirm it.
  const handleFeelingChange = useCallback(
    (next: string) => {
      onFeelingChange(next);
      setStep((previous) => Math.min(previous + 1, TOTAL_STEPS - 1));
    },
    [onFeelingChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,34rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-sm">
        <FeelingDialogHeader step={step} />
        <FeelingDialogBody
          feeling={feeling}
          feelingError={feelingError}
          rpe={rpe}
          step={step}
          onFeelingChange={handleFeelingChange}
          onRpeChange={onRpeChange}
        />
        <FeelingDialogFooter
          canAdvance={Boolean(feeling)}
          canSave={Boolean(feeling) && rpe !== null}
          step={step}
          onBack={() => setStep((previous) => Math.max(previous - 1, 0))}
          onNext={() => setStep((previous) => Math.min(previous + 1, TOTAL_STEPS - 1))}
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  );
}
