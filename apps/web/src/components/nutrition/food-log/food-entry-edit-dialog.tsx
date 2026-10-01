'use client';

import { Button } from '@sharpit/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FoodMealSelect } from '@/components/nutrition/food-log/food-meal-select';
import { FoodNumberField } from '@/components/nutrition/food-log/food-number-field';
import type { FoodMealKey } from '@sharpit/app/lib/nutrition/food-log/food-log-math';
import type { FoodLogEntryPayload } from '@sharpit/app/lib/nutrition/food-log/food-log-day';

export type FoodEntryDraft = { grams: string; meal: FoodMealKey };

/** A logged entry's weight and meal; its nutrients follow the weight. */
export function FoodEntryEditDialog({
  entry,
  draft,
  error,
  onDraftChange,
  onClose,
  onSave,
}: {
  entry: FoodLogEntryPayload | null;
  draft: FoodEntryDraft;
  error: string | null;
  onDraftChange: (patch: Partial<FoodEntryDraft>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={entry !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Modifier l’entrée</DialogTitle>
          <DialogDescription>{entry?.name}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <FoodNumberField
            label="Quantité"
            name="grams"
            unit="g"
            value={draft.grams}
            onChange={(grams) => onDraftChange({ grams })}
          />
          <FoodMealSelect
            id="food-edit-meal"
            value={draft.meal}
            onChange={(meal) => onDraftChange({ meal })}
          />
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" variant="highlight">
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
