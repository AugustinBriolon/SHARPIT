'use client';

import { useState } from 'react';
import { buildTargets } from '@/components/nutrition/food-log/food-log-forms';
import { useSaveNutritionTargets } from '@/hooks/use-data';

export function useNutritionTargetsEditor(trainingDayId: string) {
  const saveTargets = useSaveNutritionTargets(trainingDayId);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save(form: FormData) {
    const result = buildTargets(form);
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
    setOpen: (next: boolean) => {
      setError(null);
      setOpen(next);
    },
    save,
  };
}
