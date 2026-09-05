'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { useWellnessCheckin } from '@/hooks/use-wellness-checkin';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { mapSorenessUiToDomain, type WellnessUiScore } from '@/lib/health/morning-wellness-scale';
import { cn } from '@/lib/utils';

type ScaleOption = { value: WellnessUiScore; label: string };

const MOOD_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Très bas' },
  { value: 2, label: 'Bas' },
  { value: 3, label: 'Correct' },
  { value: 4, label: 'Bien' },
  { value: 5, label: 'Top' },
];

const ENERGY_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Épuisé' },
  { value: 2, label: 'Fatigué' },
  { value: 3, label: 'Moyen' },
  { value: 4, label: 'En forme' },
  { value: 5, label: 'Plein' },
];

const SORENESS_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Aucune' },
  { value: 2, label: 'Légère' },
  { value: 3, label: 'Modérée' },
  { value: 4, label: 'Forte' },
  { value: 5, label: 'Max' },
];

const STRESS_OPTIONS: ScaleOption[] = [
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
  options: ScaleOption[];
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

function dotClass(i: number, current: number): string {
  if (i === current) {
    return 'bg-primary w-5';
  }
  if (i < current) {
    return 'bg-primary/40 w-1.5';
  }
  return 'bg-border w-1.5';
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn('h-1 rounded-full transition-all duration-200', dotClass(i, current))}
        />
      ))}
    </div>
  );
}

function ScaleOptionButton({
  opt,
  selected,
  focusable,
  onSelect,
}: {
  opt: ScaleOption;
  selected: boolean;
  focusable: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-checked={selected}
      aria-label={`${opt.value} — ${opt.label}`}
      role="radio"
      tabIndex={focusable ? 0 : -1}
      type="button"
      className={cn(
        'pressable flex size-14 cursor-pointer items-center justify-center rounded-xl border transition-all duration-150',
        selected
          ? 'border-highlight bg-highlight text-highlight-foreground scale-105'
          : 'border-border/60 bg-background hover:border-primary/30 hover:bg-muted/40',
      )}
      onClick={onSelect}
    >
      <span
        className={cn(
          'font-mono text-2xl leading-none font-semibold tabular-nums',
          selected ? 'text-highlight-foreground' : 'text-foreground/70',
        )}
        aria-hidden
      >
        {opt.value}
      </span>
    </button>
  );
}

function moveScaleSelection(
  options: ScaleOption[],
  value: WellnessUiScore | null,
  delta: number,
): WellnessUiScore {
  const idx = options.findIndex((opt) => opt.value === value);
  if (idx < 0) {
    return delta >= 0 ? options[0]!.value : options.at(-1)!.value;
  }
  const next = (idx + delta + options.length) % options.length;
  return options[next]!.value;
}

function ScaleStepHeader({
  label,
  hint,
  labelId,
  hintId,
}: {
  label: string;
  hint: string;
  labelId: string;
  hintId: string;
}) {
  return (
    <div className="text-center">
      <p className="text-section-title" id={labelId}>
        {label}
      </p>
      <p className="text-muted-foreground mt-1 min-h-5 text-sm" id={hintId}>
        {hint}
      </p>
    </div>
  );
}

function ScaleStepOptions({
  options,
  value,
  onChange,
}: {
  options: ScaleOption[];
  value: WellnessUiScore | null;
  onChange: (value: WellnessUiScore) => void;
}) {
  return (
    <div className="flex w-full items-center justify-center gap-2">
      {options.map((opt, index) => {
        const selected = value === opt.value;
        const focusable = value === null ? index === 0 : selected;
        return (
          <ScaleOptionButton
            key={opt.value}
            focusable={focusable}
            opt={opt}
            selected={selected}
            onSelect={() => onChange(opt.value)}
          />
        );
      })}
    </div>
  );
}

function ScaleStep({
  step,
  value,
  onChange,
}: {
  step: Step;
  value: WellnessUiScore | null;
  onChange: (value: WellnessUiScore) => void;
}) {
  const labelId = useId();
  const hintId = useId();
  const selectedOption = step.options.find((opt) => opt.value === value) ?? null;
  const hint = selectedOption ? selectedOption.label : step.hint;

  return (
    <div
      aria-describedby={hintId}
      aria-labelledby={labelId}
      className="flex flex-col items-center gap-6"
      role="radiogroup"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          onChange(moveScaleSelection(step.options, value, 1));
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          onChange(moveScaleSelection(step.options, value, -1));
        } else if (event.key === 'Home') {
          event.preventDefault();
          onChange(step.options[0]!.value);
        } else if (event.key === 'End') {
          event.preventDefault();
          onChange(step.options.at(-1)!.value);
        }
      }}
    >
      <ScaleStepHeader hint={hint} hintId={hintId} label={step.label} labelId={labelId} />
      <ScaleStepOptions options={step.options} value={value} onChange={onChange} />
    </div>
  );
}

function NotesStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const labelId = useId();
  const hintId = useId();

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <p className="text-section-title" id={labelId}>
          Note libre
        </p>
        <p className="text-muted-foreground mt-1 text-sm" id={hintId}>
          Un contexte utile pour interpréter ta journée.
        </p>
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
        className="h-8 px-4 text-xs"
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
      className="h-8 px-3 text-xs"
      disabled={!canAdvance}
      type="button"
      variant="ghost"
      onClick={onNext}
    >
      {nextLabel}
      <ChevronRight className="size-3.5" aria-hidden />
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
      className="h-8 px-3 text-xs"
      disabled={disabled}
      type="button"
      variant="ghost"
      onClick={onBack}
    >
      <ChevronLeft className="size-3.5" aria-hidden />
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
  onOpen,
}: {
  guardDisabled: boolean;
  offline: boolean;
  offlineLabel: string;
  label: string;
  className?: string;
  onOpen: () => void;
}) {
  return (
    <Button
      className={className}
      disabled={guardDisabled}
      size="sm"
      type="button"
      variant="outline"
      onClick={onOpen}
    >
      {offline ? offlineLabel : label}
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
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center px-5 py-6">
      {form.isScaleStep ? (
        <ScaleStep
          key={STEPS[form.currentStep]!.key}
          step={STEPS[form.currentStep]!}
          value={form.values[form.currentStep]!}
          onChange={form.handleScaleChange}
        />
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
          <ProgressDots current={form.currentStep} total={TOTAL_STEPS} />
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

function useMorningWellnessDialogActions({
  form,
  submit,
  guardDisabled,
  onCompleted,
}: {
  form: ReturnType<typeof useWellnessForm>;
  submit: ReturnType<typeof useWellnessCheckin>['submit'];
  guardDisabled: boolean;
  onCompleted?: () => void;
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
      await submit({
        mood: form.mood!,
        energyLevel: form.energyLevel!,
        perceivedSoreness: mapSorenessUiToDomain(form.perceivedSoreness!),
        stressLevel: form.stressLevel!,
        notes: form.notes.trim() || null,
      });
      setOpen(false);
      form.reset();
      onCompleted?.();
    } catch {
      toast.error("Une erreur est survenue lors de l'enregistrement de ton ressenti.", {
        description: 'Réessaie plus tard.',
      });
    }
  }

  return { open, handleOpenChange, handleSubmit, openDialog: () => setOpen(true) };
}

export function MorningWellnessDialog({
  onCompleted,
  debugBypassCompleted,
  triggerClassName,
  triggerLabel = 'Ressenti du matin',
}: {
  onCompleted?: () => void;
  debugBypassCompleted?: boolean;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
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
        className={triggerClassName}
        guardDisabled={guardDisabled}
        label={triggerLabel}
        offline={offline}
        offlineLabel={offlineLabel}
        onOpen={openDialog}
      />
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
