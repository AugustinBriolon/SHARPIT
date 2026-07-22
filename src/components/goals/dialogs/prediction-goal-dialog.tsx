'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGoalMutations } from '@/hooks/use-data';
import {
  predictionToRaceGoalDefaults,
  type PredictionConfidence,
  type RunPrediction,
} from '@/lib/training/performance-predictor';

const CONFIDENCE_LABEL: Record<PredictionConfidence, string> = {
  high: 'fiable',
  medium: 'approx.',
  low: 'indicatif',
};

export function PredictionGoalDialog({
  prediction,
  onClose,
}: {
  prediction: RunPrediction;
  onClose: () => void;
}) {
  const defaults = predictionToRaceGoalDefaults(prediction);
  const { create } = useGoalMutations();
  const [title, setTitle] = useState(defaults.title);
  const [raceFormat, setRaceFormat] = useState(defaults.raceFormat);
  const [targetPerformance, setTargetPerformance] = useState(defaults.targetPerformance);
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!targetDate.trim()) {
      setError('Choisis une date de course.');
      return;
    }

    create.mutate(
      {
        title: title.trim() || defaults.title,
        kind: 'RACE',
        raceFormat: raceFormat.trim() || defaults.raceFormat,
        targetPerformance: targetPerformance.trim() || defaults.targetPerformance,
        notes: defaults.notes,
        priority: defaults.priority,
        targetDate,
      },
      {
        onSuccess: () => onClose(),
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        },
      },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transformer en objectif</DialogTitle>
          <DialogDescription>
            La prédiction préremplit la course. Il ne reste qu’à poser la date.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/40 rounded-analysis space-y-1 border px-3 py-3">
          <p className="text-label">{prediction.label}</p>
          <p className="text-data text-foreground text-2xl font-semibold">
            {prediction.displayTime}
          </p>
          <p className="text-muted-foreground text-xs">
            {prediction.pace} · {CONFIDENCE_LABEL[prediction.confidence]} · base{' '}
            {prediction.referenceLabel}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="prediction-goal-date">Date de la course</Label>
            <Input
              id="prediction-goal-date"
              min={new Date().toISOString().slice(0, 10)}
              name="targetDate"
              type="date"
              value={targetDate}
              autoFocus
              required
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prediction-goal-title">Titre</Label>
            <Input
              id="prediction-goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prediction-goal-format">Format</Label>
              <Input
                id="prediction-goal-format"
                value={raceFormat}
                onChange={(e) => setRaceFormat(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prediction-goal-perf">Temps cible</Label>
              <Input
                id="prediction-goal-perf"
                value={targetPerformance}
                onChange={(e) => setTargetPerformance(e.target.value)}
              />
            </div>
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button disabled={create.isPending} type="submit">
              {create.isPending ? 'Création…' : 'Créer l’objectif'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
