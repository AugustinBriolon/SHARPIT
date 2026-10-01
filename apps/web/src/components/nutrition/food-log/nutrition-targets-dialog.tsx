'use client';

import { Button } from '@sharpit/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FoodNumberField } from '@/components/nutrition/food-log/food-number-field';
import { TARGET_FIELDS, targetFieldValue } from '@/components/nutrition/food-log/food-log-forms';
import type { NutritionTargetsPayload } from '@sharpit/app/lib/nutrition/food-log/food-log-day';

export function NutritionTargetsForm({
  targets,
  error,
  onSave,
}: {
  targets: NutritionTargetsPayload | null;
  error: string | null;
  onSave: (form: FormData) => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(new FormData(event.currentTarget));
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        {TARGET_FIELDS.map((field) => (
          <FoodNumberField
            key={field.name}
            defaultValue={targetFieldValue(targets?.[field.name])}
            label={field.label}
            name={field.name}
            unit={field.unit}
          />
        ))}
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" variant="highlight">
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

/** The athlete's own daily targets; a blank field clears that target. */
export function NutritionTargetsDialog({
  open,
  targets,
  error,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  targets: NutritionTargetsPayload | null;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (form: FormData) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Objectifs du jour</DialogTitle>
          <DialogDescription>
            Laisse un champ vide pour ne pas suivre cet objectif.
          </DialogDescription>
        </DialogHeader>
        <NutritionTargetsForm
          key={open ? 'open' : 'closed'}
          error={error}
          targets={targets}
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  );
}
