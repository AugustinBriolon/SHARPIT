'use client';

import { ChevronLeft, ChevronRight, Smile } from 'lucide-react';
import { useCallback, useId, useRef, useState } from 'react';
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
import { cn } from '@/lib/utils';

type ScaleOption = { value: number; label: string };

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
  { value: 0, label: 'Aucune' },
  { value: 2, label: 'Légère' },
  { value: 5, label: 'Modérée' },
  { value: 8, label: 'Forte' },
  { value: 10, label: 'Max' },
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
  onSelect,
}: {
  opt: ScaleOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-checked={selected}
      aria-label={opt.label}
      role="radio"
      tabIndex={selected ? 0 : -1}
      type="button"
      className={cn(
        'pressable flex min-w-14 flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all duration-150',
        selected
          ? 'border-highlight bg-highlight text-highlight-foreground scale-105'
          : 'border-border/60 bg-background hover:border-primary/30 hover:bg-muted/40',
      )}
      onClick={onSelect}
    >
      <span
        className={cn(
          'font-mono text-2xl leading-none font-semibold tabular-nums transition-all duration-150',
          selected ? 'text-highlight-foreground' : 'text-foreground/70',
        )}
        aria-hidden
      >
        {opt.value}
      </span>
      <span
        className={cn(
          'text-xs leading-tight font-medium',
          selected ? 'text-highlight-foreground/80' : 'text-muted-foreground',
        )}
        aria-hidden
      >
        {opt.label}
      </span>
    </button>
  );
}

function ScaleStep({
  step,
  value,
  onChange,
}: {
  step: Step;
  value: number;
  onChange: (value: number) => void;
}) {
  const labelId = useId();
  const hintId = useId();

  function moveSelection(delta: number) {
    const idx = step.options.findIndex((opt) => opt.value === value);
    const base = idx < 0 ? 0 : idx;
    const next = (base + delta + step.options.length) % step.options.length;
    onChange(step.options[next]!.value);
  }

  return (
    <div
      aria-describedby={hintId}
      aria-labelledby={labelId}
      className="flex flex-col items-center gap-6"
      role="radiogroup"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          moveSelection(1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          moveSelection(-1);
        } else if (event.key === 'Home') {
          event.preventDefault();
          onChange(step.options[0]!.value);
        } else if (event.key === 'End') {
          event.preventDefault();
          onChange(step.options.at(-1)!.value);
        }
      }}
    >
      <div className="text-center">
        <p className="text-section-title" id={labelId}>
          {step.label}
        </p>
        <p className="text-muted-foreground mt-1 text-sm" id={hintId}>
          {step.hint}
        </p>
      </div>

      <div className="flex w-full items-end justify-center gap-2">
        {step.options.map((opt) => (
          <ScaleOptionButton
            key={opt.value}
            opt={opt}
            selected={value === opt.value}
            onSelect={() => onChange(opt.value)}
          />
        ))}
      </div>
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

function StepFooter({
  currentStep,
  isLastStep,
  guardDisabled,
  offline,
  offlineLabel,
  onBack,
  onNext,
  onSubmit,
}: {
  currentStep: number;
  isLastStep: boolean;
  guardDisabled: boolean;
  offline: boolean;
  offlineLabel: string;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const nextLabel = currentStep === STEPS.length - 1 ? 'Note' : 'Suivant';

  return (
    <div className="border-border/60 flex shrink-0 items-center justify-between border-t px-5 py-3">
      <Button
        className="h-8 px-3 text-xs"
        disabled={currentStep === 0}
        type="button"
        variant="ghost"
        onClick={onBack}
      >
        <ChevronLeft className="size-3.5" aria-hidden />
        Retour
      </Button>

      {isLastStep ? (
        <Button
          className="h-8 px-4 text-xs"
          disabled={guardDisabled}
          type="button"
          onClick={onSubmit}
        >
          {offline ? offlineLabel : 'Valider'}
        </Button>
      ) : (
        <Button className="h-8 px-3 text-xs" type="button" variant="ghost" onClick={onNext}>
          {nextLabel}
          <ChevronRight className="size-3.5" aria-hidden />
        </Button>
      )}
    </div>
  );
}

function useWellnessForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [mood, setMood] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [perceivedSoreness, setPerceivedSoreness] = useState(2);
  const [stressLevel, setStressLevel] = useState(2);
  const [notes, setNotes] = useState('');
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const values = [mood, energyLevel, perceivedSoreness, stressLevel];
  const setters = [setMood, setEnergyLevel, setPerceivedSoreness, setStressLevel];

  const handleScaleChange = useCallback(
    (value: number) => {
      setters[currentStep]?.(value);
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
      }
      autoAdvanceTimer.current = setTimeout(() => {
        setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
      }, 400);
    },
    [currentStep, setters],
  );

  const reset = useCallback(() => {
    setCurrentStep(0);
  }, []);

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
  };
}

export function MorningWellnessDialog({
  onCompleted,
  debugBypassCompleted,
}: {
  onCompleted?: () => void;
  debugBypassCompleted?: boolean;
}) {
  const { completed, loading, error, submit } = useWellnessCheckin();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const [open, setOpen] = useState(false);
  const form = useWellnessForm();

  // Dev override: always show the button if debugBypassCompleted is true
  // Otherwise, only show if not completed or in development (allow retry)
  const isDevMode = process.env.NODE_ENV === 'development';
  const shouldHide = loading || (completed && !debugBypassCompleted && !isDevMode);

  if (shouldHide) {
    return null;
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset();
    }
  }

  async function handleSubmit() {
    if (guardDisabled) {
      return;
    }
    try {
      await submit({
        mood: form.mood,
        energyLevel: form.energyLevel,
        perceivedSoreness: form.perceivedSoreness,
        stressLevel: form.stressLevel,
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        disabled={guardDisabled}
        type="button"
        variant="highlight"
        onClick={() => setOpen(true)}
      >
        <Smile className="size-3" aria-hidden />
        {offline ? offlineLabel : 'Ressenti'}
      </Button>

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

        <StepFooter
          currentStep={form.currentStep}
          guardDisabled={guardDisabled}
          isLastStep={form.isLastStep}
          offline={offline}
          offlineLabel={offlineLabel}
          onBack={() => form.setCurrentStep((prev) => Math.max(prev - 1, 0))}
          onNext={() => form.setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1))}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
