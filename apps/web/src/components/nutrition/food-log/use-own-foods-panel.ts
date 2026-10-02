'use client';

import { useState } from 'react';
import {
  buildCustomFood,
  buildCustomFoodUpdate,
} from '@/components/nutrition/food-log/food-log-forms';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useCreateCustomFood,
  useDeleteCustomFood,
  useOwnFoods,
  useUpdateCustomFood,
} from '@/hooks/use-data';
import type { FoodProductPayload } from '@sharpit/app/lib/nutrition/food-log/food-log-day';

/** What the panel shows: the list, or the form creating or editing one food. */
export type OwnFoodsPanelMode =
  { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; food: FoodProductPayload };

const message = (error: unknown) => (error instanceof Error ? error.message : 'Saisie invalide.');

/** « Mes aliments » outside a meal: list, create, edit, delete — nothing to log. */
export function useOwnFoodsPanel() {
  const foods = useOwnFoods(true);
  const create = useCreateCustomFood();
  const update = useUpdateCustomFood();
  const remove = useDeleteCustomFood();
  const { confirm, dialog } = useConfirmDialog();
  const [mode, setMode] = useState<OwnFoodsPanelMode>({ kind: 'list' });
  const [error, setError] = useState<string | null>(null);

  const show = (next: OwnFoodsPanelMode) => {
    setError(null);
    setMode(next);
  };
  const done = {
    onSuccess: () => show({ kind: 'list' }),
    onError: (e: unknown) => setError(message(e)),
  };

  return {
    mode,
    error: error ?? (foods.error instanceof Error ? foods.error.message : null),
    foods: foods.data?.foods ?? [],
    loading: foods.isPending,
    pending: create.isPending || update.isPending,
    confirmDialog: dialog,
    show,
    submit: (form: FormData) => {
      if (mode.kind === 'edit') {
        const result = buildCustomFoodUpdate(form);
        return result.ok
          ? update.mutate({ id: mode.food.id, input: result.value }, done)
          : setError(result.message);
      }
      const result = buildCustomFood(form);
      return result.ok ? create.mutate(result.value, done) : setError(result.message);
    },
    remove: async (food: FoodProductPayload) => {
      const confirmed = await confirm({
        title: `Supprimer « ${food.name} » ?`,
        description: 'Tes repas déjà notés gardent leurs valeurs.',
        confirmLabel: 'Supprimer',
        variant: 'destructive',
      });
      if (confirmed) {
        remove.mutate(food.id, { onError: (e) => setError(message(e)) });
      }
    },
  };
}
