'use client';

import { Button } from '@sharpit/ui/components/ui/button';
import { FoodNumberField } from '@/components/nutrition/food-log/food-number-field';
import { FoodTextField } from '@/components/nutrition/food-log/food-quick-step';

/** The athlete's own food, per 100 g — kept for the next searches. */
export function FoodCustomStep({
  pending,
  error,
  onSubmit,
}: {
  pending: boolean;
  error: string | null;
  onSubmit: (form: FormData) => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
      }}
    >
      <FoodTextField label="Nom" name="name" required />
      <FoodTextField label="Marque" name="brand" />
      <p className="text-label text-muted-foreground">Pour 100 g</p>
      <div className="grid grid-cols-2 gap-3">
        <FoodNumberField label="Calories" name="kcalPer100g" unit="kcal" required />
        <FoodNumberField label="Protéines" name="proteinPer100g" unit="g" required />
        <FoodNumberField label="Glucides" name="carbsPer100g" unit="g" required />
        <FoodNumberField label="Lipides" name="fatPer100g" unit="g" required />
        <FoodNumberField label="Portion habituelle" name="servingGrams" unit="g" />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex justify-end">
        <Button disabled={pending} type="submit" variant="highlight">
          Créer l’aliment
        </Button>
      </div>
    </form>
  );
}
