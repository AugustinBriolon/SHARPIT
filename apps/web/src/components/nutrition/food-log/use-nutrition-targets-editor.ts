'use client';

import { useState } from 'react';
import {
  buildTargets,
  readTargetSplit,
  targetSplitDraft,
  type TargetSplitDraft,
} from '@/components/nutrition/food-log/food-log-forms';
import { useSaveNutritionTargets } from '@/hooks/use-data';
import type { NutritionTargetsPayload } from '@sharpit/app/lib/nutrition/food-log/food-log-day';
import type { NutritionTargetMode } from '@sharpit/app/lib/nutrition/food-log/nutrition-targets';

/** The targets dialog: open state, the mode, the « % » draft read live, and the save. */
export function useNutritionTargetsEditor(
  trainingDayId: string,
  targets: NutritionTargetsPayload | null,
) {
  const saveTargets = useSaveNutritionTargets(trainingDayId);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<NutritionTargetMode>('GRAMS');
  const [split, setSplit] = useState<TargetSplitDraft>(() => targetSplitDraft(targets));
  const reading = readTargetSplit(split);

  function save(form: FormData) {
    const result = buildTargets(form, mode);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    saveTargets.mutate(result.value);
    setOpen(false);
  }

  return {
    open,
    error,
    mode,
    split,
    reading,
    canSave: mode === 'GRAMS' || reading.balanced,
    setOpen: (next: boolean) => {
      setError(null);
      setMode(targets?.mode ?? 'GRAMS');
      setSplit(targetSplitDraft(targets));
      setOpen(next);
    },
    setMode: (next: NutritionTargetMode) => {
      setError(null);
      setMode(next);
    },
    patchSplit: (patch: Partial<TargetSplitDraft>) => setSplit((draft) => ({ ...draft, ...patch })),
    save,
  };
}

export type NutritionTargetsEditor = ReturnType<typeof useNutritionTargetsEditor>;
