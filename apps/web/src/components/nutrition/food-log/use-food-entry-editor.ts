'use client';

import { useState } from 'react';
import { toast } from '@/components/ui/toast';
import { buildEntryUpdate } from '@/components/nutrition/food-log/food-log-forms';
import type { FoodEntryDraft } from '@/components/nutrition/food-log/food-entry-edit-dialog';
import { useAddFoodLogEntry, useDeleteFoodLogEntry, useUpdateFoodLogEntry } from '@/hooks/use-data';
import {
  entryRecreateInput,
  type FoodLogEntryPayload,
} from '@sharpit/app/lib/nutrition/food-log/food-log-day';

function draftOf(entry: FoodLogEntryPayload): FoodEntryDraft {
  return { grams: String(entry.grams), meal: entry.meal };
}

/** Undo beats a confirm: deleting is one tap, and the toast offers it back. */
function useDeleteWithUndo(trainingDayId: string) {
  const remove = useDeleteFoodLogEntry(trainingDayId);
  const add = useAddFoodLogEntry(trainingDayId);
  return (entry: FoodLogEntryPayload) => {
    remove.mutate(entry.id);
    toast.success(`${entry.name} supprimé`, {
      actionProps: {
        children: 'Annuler',
        onClick: () =>
          add.mutate({ input: entryRecreateInput(entry, trainingDayId), preview: entry }),
      },
    });
  };
}

export function useFoodEntryEditor(trainingDayId: string) {
  const update = useUpdateFoodLogEntry(trainingDayId);
  const [entry, setEntry] = useState<FoodLogEntryPayload | null>(null);
  const [draft, setDraft] = useState<FoodEntryDraft>({ grams: '', meal: 'BREAKFAST' });
  const [error, setError] = useState<string | null>(null);

  function openEditor(next: FoodLogEntryPayload) {
    setDraft(draftOf(next));
    setError(null);
    setEntry(next);
  }

  function save() {
    const result = entry ? buildEntryUpdate(entry, draft) : null;
    if (result && !result.ok) {
      setError(result.message);
      return;
    }
    if (result?.value) {
      update.mutate(result.value);
    }
    setEntry(null);
  }

  return {
    entry,
    draft,
    error,
    openEditor,
    close: () => setEntry(null),
    patchDraft: (patch: Partial<FoodEntryDraft>) =>
      setDraft((current) => ({ ...current, ...patch })),
    save,
    remove: useDeleteWithUndo(trainingDayId),
  };
}
