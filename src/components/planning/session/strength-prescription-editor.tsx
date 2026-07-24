'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  attachGarminRefsToPrescription,
  strengthSetWatchCompat,
  type StrengthPrescription,
} from '@/lib/planned-session/strength-prescription';
import { resolveGarminExerciseMatch } from '@/lib/integrations/garmin-exercise-map';

export type StrengthPrescriptionDraftRow = {
  key: string;
  exercise: string;
  sets: string;
  reps: string;
  weightKg: string;
  restSec: string;
  durationSec: string;
};

function newRow(partial?: Partial<StrengthPrescriptionDraftRow>): StrengthPrescriptionDraftRow {
  return {
    key: crypto.randomUUID(),
    exercise: '',
    sets: '3',
    reps: '10',
    weightKg: '',
    restSec: '90',
    durationSec: '',
    ...partial,
  };
}

export function draftFromStrengthPrescription(
  prescription: StrengthPrescription | null | undefined,
): StrengthPrescriptionDraftRow[] {
  if (!prescription?.sets.length) return [newRow()];
  return prescription.sets
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((set) =>
      newRow({
        exercise: set.exercise,
        sets: String(set.sets),
        reps: String(set.reps),
        weightKg: set.weightKg != null ? String(set.weightKg) : '',
        restSec: set.restSec != null ? String(set.restSec) : '',
        durationSec: set.durationSec != null ? String(set.durationSec) : '',
      }),
    );
}

export function strengthPrescriptionFromDraft(
  rows: StrengthPrescriptionDraftRow[],
): StrengthPrescription | null {
  const sets = rows
    .map((row, order) => {
      const exercise = row.exercise.trim();
      if (!exercise) return null;
      const setsCount = Number(row.sets);
      const reps = Number(row.reps);
      if (!Number.isFinite(setsCount) || setsCount < 1) return null;
      const durationSec = row.durationSec.trim() ? Number(row.durationSec) : null;
      const weightKg = row.weightKg.trim() ? Number(row.weightKg) : null;
      const restSec = row.restSec.trim() ? Number(row.restSec) : null;
      return {
        exercise,
        exerciseCatalogId: null,
        sets: setsCount,
        reps: Number.isFinite(reps) ? Math.max(0, reps) : 0,
        durationSec: durationSec != null && Number.isFinite(durationSec) ? durationSec : null,
        weightKg: weightKg != null && Number.isFinite(weightKg) ? weightKg : null,
        restSec: restSec != null && Number.isFinite(restSec) ? restSec : null,
        notes: null,
        order,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s != null);

  if (sets.length === 0) return null;
  return attachGarminRefsToPrescription({ version: 1, sets });
}

function draftWatchHint(exercise: string): string | null {
  const trimmed = exercise.trim();
  if (!trimmed) return null;
  const match = resolveGarminExerciseMatch({ exercise: trimmed });
  return strengthSetWatchCompat({
    garmin: match
      ? {
          category: match.ref.category,
          exerciseName: match.ref.exerciseName,
          labelFr: match.labelFr,
          confidence: match.confidence,
        }
      : null,
  }).label;
}

export function StrengthPrescriptionEditor({
  rows,
  onChange,
}: {
  rows: StrengthPrescriptionDraftRow[];
  onChange: (rows: StrengthPrescriptionDraftRow[]) => void;
}) {
  function updateRow(key: string, patch: Partial<StrengthPrescriptionDraftRow>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Exercices (montre)</Label>
        <Button
          size="sm"
          type="button"
          variant="outline"
          onClick={() => onChange([...rows, newRow()])}
        >
          <Plus className="size-3.5" />
          Ajouter
        </Button>
      </div>
      {rows.map((row, index) => {
        const watchHint = draftWatchHint(row.exercise);
        return (
          <div
            key={row.key}
            className="border-analysis-border/60 bg-analysis-surface-alt/40 space-y-2 rounded-lg border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Exo {index + 1}
              </span>
              {rows.length > 1 ? (
                <button
                  aria-label="Supprimer cet exercice"
                  className="text-muted-foreground hover:text-destructive"
                  type="button"
                  onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Input
                placeholder="Pompe, squat, développé…"
                value={row.exercise}
                onChange={(e) => updateRow(row.key, { exercise: e.target.value })}
              />
              {watchHint ? (
                <p
                  className={
                    watchHint.startsWith('Hors')
                      ? 'text-muted-foreground/80 text-[10px]'
                      : watchHint.startsWith('Approx')
                        ? 'text-[10px] text-amber-700/90 dark:text-amber-400/90'
                        : 'text-muted-foreground text-[10px]'
                  }
                >
                  {watchHint}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-[10px]">Séries</Label>
                <Input
                  inputMode="numeric"
                  min={1}
                  type="number"
                  value={row.sets}
                  onChange={(e) => updateRow(row.key, { sets: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-[10px]">Reps</Label>
                <Input
                  inputMode="numeric"
                  min={0}
                  type="number"
                  value={row.reps}
                  onChange={(e) => updateRow(row.key, { reps: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-[10px]">Poids kg</Label>
                <Input
                  inputMode="decimal"
                  min={0}
                  step="0.5"
                  type="number"
                  value={row.weightKg}
                  onChange={(e) => updateRow(row.key, { weightKg: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-[10px]">Repos s</Label>
                <Input
                  inputMode="numeric"
                  min={0}
                  type="number"
                  value={row.restSec}
                  onChange={(e) => updateRow(row.key, { restSec: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-[10px]">Durée s</Label>
                <Input
                  inputMode="numeric"
                  min={0}
                  placeholder="planche"
                  type="number"
                  value={row.durationSec}
                  onChange={(e) => updateRow(row.key, { durationSec: e.target.value })}
                />
              </div>
            </div>
          </div>
        );
      })}
      <p className="text-muted-foreground text-[10px] leading-relaxed">
        Match catalogue Garmin Connect (~1500 exercices). « Hors catalogue » partira comme Inconnu
        sur la montre ; « Approx. » est le plus proche trouvé.
      </p>
    </div>
  );
}
