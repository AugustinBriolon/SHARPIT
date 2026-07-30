'use client';

import { Smile } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useWellnessCheckin } from '@/hooks/use-wellness-checkin';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';

type ScaleOption = { value: number; label: string; icon: string };

const MOOD_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Très bas', icon: '😞' },
  { value: 2, label: 'Bas', icon: '😕' },
  { value: 3, label: 'Correct', icon: '😐' },
  { value: 4, label: 'Bien', icon: '🙂' },
  { value: 5, label: 'Top', icon: '😄' },
];

const ENERGY_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Épuisé', icon: '🪫' },
  { value: 2, label: 'Fatigué', icon: '😴' },
  { value: 3, label: 'Moyen', icon: '⚡' },
  { value: 4, label: 'En forme', icon: '💪' },
  { value: 5, label: 'Plein', icon: '🔋' },
];

const SORENESS_OPTIONS: ScaleOption[] = [
  { value: 0, label: 'Aucune', icon: '✨' },
  { value: 2, label: 'Légère', icon: '🦵' },
  { value: 5, label: 'Modérée', icon: '😣' },
  { value: 8, label: 'Forte', icon: '🔥' },
  { value: 10, label: 'Max', icon: '🛑' },
];

const STRESS_OPTIONS: ScaleOption[] = [
  { value: 1, label: 'Calme', icon: '🫧' },
  { value: 2, label: 'Léger', icon: '🙂' },
  { value: 3, label: 'Modéré', icon: '😐' },
  { value: 4, label: 'Élevé', icon: '😵' },
  { value: 5, label: 'Très haut', icon: '🚨' },
];

function ScalePicker({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  options: ScaleOption[];
  value: number;
  onChange: (value: number) => void;
}) {
  const labelId = useId();
  const hintId = useId();

  function moveSelection(delta: number) {
    const index = options.findIndex((opt) => opt.value === value);
    const fallback = index < 0 ? 0 : index;
    const next = (fallback + delta + options.length) % options.length;
    onChange(options[next]!.value);
  }

  return (
    <div
      aria-describedby={hintId}
      aria-labelledby={labelId}
      className="space-y-2.5"
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
          onChange(options[0]!.value);
        } else if (event.key === 'End') {
          event.preventDefault();
          onChange(options.at(-1)!.value);
        }
      }}
    >
      <div>
        <p className="text-foreground text-sm font-medium" id={labelId}>
          {label}
        </p>
        <p className="text-muted-foreground text-xs" id={hintId}>
          {hint}
        </p>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              aria-checked={selected}
              aria-label={opt.label}
              role="radio"
              tabIndex={selected ? 0 : -1}
              type="button"
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition-colors',
                selected
                  ? 'border-highlight bg-highlight text-highlight-foreground'
                  : 'border-border/70 bg-background hover:border-primary/30 hover:bg-muted/40',
              )}
              onClick={() => onChange(opt.value)}
            >
              <span className="text-xl leading-none" aria-hidden>
                {opt.icon}
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
        })}
      </div>
    </div>
  );
}

export function MorningWellnessDialog({ onCompleted }: { onCompleted?: () => void }) {
  const { completed, loading, submitting, error, submit } = useWellnessCheckin();
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [perceivedSoreness, setPerceivedSoreness] = useState(2);
  const [stressLevel, setStressLevel] = useState(2);
  const [notes, setNotes] = useState('');

  if (loading || completed) return null;

  async function handleSubmit() {
    try {
      await submit({
        mood,
        energyLevel,
        perceivedSoreness,
        stressLevel,
        notes: notes.trim() || null,
      });
      setOpen(false);
      onCompleted?.();
    } catch {
      toast.error("Une erreur est survenue lors de l'enregistrement de ton ressenti.", {
        description: 'Réessaie plus tard.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="highlight" onClick={() => setOpen(true)}>
        <Smile className="size-3" aria-hidden />
        Ressenti
      </Button>

      <DialogContent className="flex max-h-[min(92dvh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 space-y-1 border-b px-5 py-4 pr-12 text-left">
          <DialogTitle className="font-heading text-lg">Ton ressenti du matin</DialogTitle>
          <DialogDescription>
            Quelques secondes pour affiner ta récupération et la fiabilité du bilan.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4">
          <ScalePicker
            hint="Comment te sens-tu psychologiquement ?"
            label="Humeur"
            options={MOOD_OPTIONS}
            value={mood}
            onChange={setMood}
          />
          <ScalePicker
            hint="Ton niveau d'énergie au réveil."
            label="Énergie"
            options={ENERGY_OPTIONS}
            value={energyLevel}
            onChange={setEnergyLevel}
          />
          <ScalePicker
            hint="Sensations musculaires et courbatures."
            label="Corps"
            options={SORENESS_OPTIONS}
            value={perceivedSoreness}
            onChange={setPerceivedSoreness}
          />
          <ScalePicker
            hint="Charge mentale, tension ou pression ressentie."
            label="Stress"
            options={STRESS_OPTIONS}
            value={stressLevel}
            onChange={setStressLevel}
          />
          <div className="space-y-2.5">
            <div>
              <Label
                className="text-foreground text-sm font-medium"
                htmlFor="morning-wellness-notes"
              >
                Note libre
              </Label>
              <p className="text-muted-foreground text-xs" id="morning-wellness-notes-hint">
                Un contexte utile pour interpréter ta journée.
              </p>
            </div>
            <Textarea
              aria-describedby="morning-wellness-notes-hint"
              id="morning-wellness-notes"
              placeholder="Ex: nuit hachée, pression pro, jambes lourdes..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {error ? (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-border/60 bg-muted/40 shrink-0 border-t px-5 py-4">
          <Button className="w-full" disabled={submitting} type="button" onClick={handleSubmit}>
            {submitting ? 'Enregistrement…' : 'Valider mon ressenti'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
