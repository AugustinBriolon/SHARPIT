'use client';

import { Smile } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-sm font-medium text-neutral-800">{label}</p>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={cn(
              'flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition-all',
              value === opt.value
                ? 'border-neutral-900 bg-neutral-900/4 shadow-[inset_0_0_0_1px_rgba(23,23,23,1)]'
                : 'border-neutral-200/80 bg-white hover:border-neutral-300 hover:bg-neutral-50',
            )}
            onClick={() => onChange(opt.value)}
          >
            <span className="text-xl leading-none" aria-hidden>
              {opt.icon}
            </span>
            <span className="text-[9px] leading-tight font-medium text-neutral-500">
              {opt.label}
            </span>
          </button>
        ))}
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

  if (loading || completed) return null;

  async function handleSubmit() {
    try {
      await submit({ mood, energyLevel, perceivedSoreness });
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
      <button
        className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-neutral-300/90 bg-white px-2.5 py-1 text-[10px] font-medium transition-colors hover:border-neutral-400 hover:bg-neutral-50"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Smile className="size-3" aria-hidden />
        Ressenti
      </button>

      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-1 border-b px-5 py-4 text-left">
          <DialogTitle className="font-heading text-lg">Ton ressenti du matin</DialogTitle>
          <DialogDescription>
            Quelques secondes pour affiner ta récupération et la fiabilité du bilan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-4">
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

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="border-t bg-neutral-50/80 px-5 py-4">
          <Button className="w-full" disabled={submitting} type="button" onClick={handleSubmit}>
            {submitting ? 'Enregistrement…' : 'Valider mon ressenti'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
