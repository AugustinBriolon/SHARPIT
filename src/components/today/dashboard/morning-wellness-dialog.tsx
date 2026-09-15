'use client';

import { useCallback, useId, useState, type ReactNode } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { useWellnessCheckin } from '@/hooks/use-wellness-checkin';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { mapSorenessUiToDomain, type WellnessUiScore } from '@/lib/journal/morning-wellness-scale';
import { JOURNAL_WEIGHT_BADGE } from '@/lib/journal/reliability-weighting';
import { cn } from '@/lib/utils';

type WellnessOption = ScaleOption<WellnessUiScore>;

const MOOD_OPTIONS: readonly WellnessOption[] = [
  { value: 1, label: 'Très bas' },
  { value: 2, label: 'Bas' },
  { value: 3, label: 'Correct' },
  { value: 4, label: 'Bien' },
  { value: 5, label: 'Top' },
];

const ENERGY_OPTIONS: readonly WellnessOption[] = [
  { value: 1, label: 'Épuisé' },
  { value: 2, label: 'Fatigué' },
  { value: 3, label: 'Moyen' },
  { value: 4, label: 'En forme' },
  { value: 5, label: 'Plein' },
];

const SORENESS_OPTIONS: readonly WellnessOption[] = [
  { value: 1, label: 'Aucune' },
  { value: 2, label: 'Légère' },
  { value: 3, label: 'Modérée' },
  { value: 4, label: 'Forte' },
  { value: 5, label: 'Max' },
];

const STRESS_OPTIONS: readonly WellnessOption[] = [
  { value: 1, label: 'Calme' },
  { value: 2, label: 'Léger' },
  { value: 3, label: 'Modéré' },
  { value: 4, label: 'Élevé' },
  { value: 5, label: 'Très haut' },
];

type Step = {
  key: string;
  label: string;
  hint: string;
  options: readonly WellnessOption[];
};

const STEPS: Step[] = [
  {
    key: 'mood',
    label: 'Humeur',
    hint: 'Comment te sens-tu psychologiquement ?',
    options: MOOD_OPTIONS,
  },
  {
    key: 'energy',
    label: 'Énergie',
    hint: "Ton niveau d'énergie au réveil.",
    options: ENERGY_OPTIONS,
  },
  {
    key: 'soreness',
    label: 'Corps',
    hint: 'Sensations musculaires et courbatures.',
    options: SORENESS_OPTIONS,
  },
  {
    key: 'stress',
    label: 'Stress',
    hint: 'Charge mentale, tension ou pression ressentie.',
    options: STRESS_OPTIONS,
  },
];

const TOTAL_STEPS = STEPS.length + 1;

function NotesStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const labelId = useId();
  const hintId = useId();

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="text-center">
        <p className="text-section-title" id={labelId}>
          Note
        </p>
        <p className="text-muted-foreground mt-1 text-sm" id={hintId}>
          Optionnel. Un détail pour le coach si besoin.
        </p>
        <span className="bg-muted text-muted-foreground mt-2 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
          {JOURNAL_WEIGHT_BADGE.notedNotWeighted}
        </span>
      </div>
      <Textarea
        aria-describedby={hintId}
        aria-labelledby={labelId}
        className="w-full"
        placeholder="Ex: nuit hachée, pression pro, jambes lourdes…"
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function StepFooterPrimaryAction({
  isLastStep,
  canAdvance,
  canSubmit,
  guardDisabled,
  offline,
  offlineLabel,
  nextLabel,
  onNext,
  onSubmit,
}: {
  isLastStep: boolean;
  canAdvance: boolean;
  canSubmit: boolean;
  guardDisabled: boolean;
  offline: boolean;
  offlineLabel: string;
  nextLabel: string;
  onNext: () => void;
  onSubmit: () => void;
}) {
  if (isLastStep) {
    return (
      <Button
        className="h-11 px-4 text-xs lg:h-8"
        disabled={guardDisabled || !canSubmit}
        type="button"
        onClick={onSubmit}
      >
        {offline ? offlineLabel : 'Valider'}
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
      {nextLabel}
      <NavArrowRight className="size-3.5" aria-hidden />
    </Button>
  );
}

type StepFooterProps = {
  currentStep: number;
  isLastStep: boolean;
  canAdvance: boolean;
  canSubmit: boolean;
  guardDisabled: boolean;
  offline: boolean;
  offlineLabel: string;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
};

function StepFooterBackButton({ disabled, onBack }: { disabled: boolean; onBack: () => void }) {
  return (
    <Button
      className="h-11 px-3 text-xs lg:h-8"
      disabled={disabled}
      type="button"
      variant="ghost"
      onClick={onBack}
    >
      <NavArrowLeft className="size-3.5" aria-hidden />
      Retour
    </Button>
  );
}

function StepFooter({
  currentStep,
  isLastStep,
  canAdvance,
  canSubmit,
  guardDisabled,
  offline,
  offlineLabel,
  onBack,
  onNext,
  onSubmit,
}: StepFooterProps) {
  const nextLabel = currentStep === STEPS.length - 1 ? 'Note' : 'Suivant';

  return (
    <div className="border-border/60 flex shrink-0 items-center justify-between border-t px-5 py-3">
      <StepFooterBackButton disabled={currentStep === 0} onBack={onBack} />
      <StepFooterPrimaryAction
        canAdvance={canAdvance}
        canSubmit={canSubmit}
        guardDisabled={guardDisabled}
        isLastStep={isLastStep}
        nextLabel={nextLabel}
        offline={offline}
        offlineLabel={offlineLabel}
        onNext={onNext}
        onSubmit={onSubmit}
      />
    </div>
  );
}

function useWellnessForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [mood, setMood] = useState<WellnessUiScore | null>(null);
  const [energyLevel, setEnergyLevel] = useState<WellnessUiScore | null>(null);
  const [perceivedSoreness, setPerceivedSoreness] = useState<WellnessUiScore | null>(null);
  const [stressLevel, setStressLevel] = useState<WellnessUiScore | null>(null);
  const [notes, setNotes] = useState('');

  const values = [mood, energyLevel, perceivedSoreness, stressLevel];

  const handleScaleChange = useCallback(
    (value: WellnessUiScore) => {
      ([setMood, setEnergyLevel, setPerceivedSoreness, setStressLevel] as const)[currentStep]?.(
        value,
      );
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
    },
    [currentStep],
  );

  const reset = useCallback(() => {
    setCurrentStep(0);
    setMood(null);
    setEnergyLevel(null);
    setPerceivedSoreness(null);
    setStressLevel(null);
    setNotes('');
  }, []);

  const allScalesAnswered =
    mood !== null && energyLevel !== null && perceivedSoreness !== null && stressLevel !== null;

  return {
    currentStep,
    setCurrentStep,
    mood,
    energyLevel,
    perceivedSoreness,
    stressLevel,
    notes,
    setNotes,
    values,
    handleScaleChange,
    reset,
    isLastStep: currentStep === TOTAL_STEPS - 1,
    isScaleStep: currentStep < STEPS.length,
    canAdvance: currentStep >= STEPS.length || values[currentStep] !== null,
    canSubmit: allScalesAnswered,
  };
}

function shouldHideWellnessTrigger(
  loading: boolean,
  completed: boolean,
  debugBypassCompleted: boolean | undefined,
): boolean {
  if (loading) {
    return true;
  }
  if (!completed) {
    return false;
  }
  if (debugBypassCompleted) {
    return false;
  }
  return process.env.NODE_ENV !== 'development';
}

function MorningWellnessTrigger({
  guardDisabled,
  offline,
  offlineLabel,
  label,
  className,
  children,
  ariaLabel,
  onOpen,
}: {
  guardDisabled: boolean;
  offline: boolean;
  offlineLabel: string;
  label: string;
  className?: string;
  children?: ReactNode;
  ariaLabel?: string;
  onOpen: () => void;
}) {
  return (
    <Button
      aria-label={offline ? offlineLabel : ariaLabel}
      className={className}
      disabled={guardDisabled}
      size="sm"
      type="button"
      variant="outline"
      onClick={onOpen}
    >
      {offline ? offlineLabel : (children ?? label)}
    </Button>
  );
}

function MorningWellnessDialogBody({
  form,
  error,
}: {
  form: ReturnType<typeof useWellnessForm>;
  error: string | null;
}) {
  const step = STEPS[form.currentStep];

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center px-5 py-6">
      {form.isScaleStep && step ? (
        <div className="flex w-full flex-col items-center gap-3">
          <ScalePicker
            key={step.key}
            hint={step.hint}
            options={step.options}
            title={step.label}
            value={form.values[form.currentStep] ?? null}
            onChange={form.handleScaleChange}
          />
          <span
            className={cn(
              'bg-primary/12 text-primary inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
            )}
          >
            {JOURNAL_WEIGHT_BADGE.weighted}
          </span>
        </div>
      ) : (
        <NotesStep value={form.notes} onChange={form.setNotes} />
      )}
      {error ? (
        <p className="text-destructive mt-4 text-center text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function MorningWellnessDialogPanel({
  form,
  error,
  guardDisabled,
  offline,
  offlineLabel,
  onSubmit,
}: {
  form: ReturnType<typeof useWellnessForm>;
  error: string | null;
  guardDisabled: boolean;
  offline: boolean;
  offlineLabel: string;
  onSubmit: () => void;
}) {
  return (
    <DialogContent className="flex max-h-[min(92dvh,32rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-sm">
      <DialogHeader className="shrink-0 border-b px-5 py-3 pr-12 text-left">
        <div className="flex items-center justify-between gap-3">
          <DialogTitle className="font-heading text-base">Ressenti du matin</DialogTitle>
          <StepDots current={form.currentStep} total={TOTAL_STEPS} />
        </div>
        <DialogDescription className="sr-only">
          Quelques secondes pour affiner ta récupération et la fiabilité du bilan.
        </DialogDescription>
      </DialogHeader>
      <MorningWellnessDialogBody error={error} form={form} />
      <StepFooter
        canAdvance={form.canAdvance}
        canSubmit={form.canSubmit}
        currentStep={form.currentStep}
        guardDisabled={guardDisabled}
        isLastStep={form.isLastStep}
        offline={offline}
        offlineLabel={offlineLabel}
        onBack={() => form.setCurrentStep((prev) => Math.max(prev - 1, 0))}
        onNext={() => form.setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1))}
        onSubmit={onSubmit}
      />
    </DialogContent>
  );
}

export type MorningWellnessCompleted = {
  moodLabel: string;
};

function useMorningWellnessDialogActions({
  form,
  submit,
  guardDisabled,
  onCompleted,
}: {
  form: ReturnType<typeof useWellnessForm>;
  submit: ReturnType<typeof useWellnessCheckin>['submit'];
  guardDisabled: boolean;
  onCompleted?: (result: MorningWellnessCompleted) => void;
}) {
  const [open, setOpen] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset();
    }
  }

  async function handleSubmit() {
    if (guardDisabled || !form.canSubmit) {
      return;
    }
    try {
      const moodLabel =
        MOOD_OPTIONS.find((option) => option.value === form.mood)?.label ?? 'Ressenti saisi';
      const notes = form.notes.trim() || null;
      await submit({
        mood: form.mood!,
        energyLevel: form.energyLevel!,
        perceivedSoreness: mapSorenessUiToDomain(form.perceivedSoreness!),
        stressLevel: form.stressLevel!,
        notes,
      });
      setOpen(false);
      form.reset();
      onCompleted?.({ moodLabel });
    } catch {
      toast.error("Une erreur est survenue lors de l'enregistrement de ton ressenti.", {
        description: 'Réessaie plus tard.',
      });
    }
  }

  return { open, handleOpenChange, handleSubmit, openDialog: () => setOpen(true) };
}

type MorningWellnessDialogProps = {
  onCompleted?: (result: MorningWellnessCompleted) => void;
  debugBypassCompleted?: boolean;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerChildren?: ReactNode;
  triggerAriaLabel?: string;
};

export function MorningWellnessDialog({
  onCompleted,
  debugBypassCompleted,
  triggerClassName,
  triggerLabel = 'Ressenti du matin',
  triggerChildren,
  triggerAriaLabel,
}: MorningWellnessDialogProps) {
  const { completed, loading, error, submit } = useWellnessCheckin();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const form = useWellnessForm();
  const { open, handleOpenChange, handleSubmit, openDialog } = useMorningWellnessDialogActions({
    form,
    submit,
    guardDisabled,
    onCompleted,
  });

  if (shouldHideWellnessTrigger(loading, completed, debugBypassCompleted)) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <MorningWellnessTrigger
        ariaLabel={triggerAriaLabel}
        className={triggerClassName}
        guardDisabled={guardDisabled}
        label={triggerLabel}
        offline={offline}
        offlineLabel={offlineLabel}
        onOpen={openDialog}
      >
        {triggerChildren}
      </MorningWellnessTrigger>
      <MorningWellnessDialogPanel
        error={error}
        form={form}
        guardDisabled={guardDisabled}
        offline={offline}
        offlineLabel={offlineLabel}
        onSubmit={handleSubmit}
      />
    </Dialog>
  );
}
