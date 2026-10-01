'use client';

import { Button } from '@sharpit/ui/components/ui/button';
import { FoodNumberField } from '@/components/nutrition/food-log/food-number-field';
import { FoodTextField } from '@/components/nutrition/food-log/food-quick-step';
import { targetFieldValue } from '@/components/nutrition/food-log/food-log-forms';
import type { FoodProductPayload } from '@sharpit/app/lib/nutrition/food-log/food-log-day';

/** The athlete's own food, per 100 g — kept for the next searches; prefilled when edited. */
export function FoodCustomStep({
  pending,
  error,
  food,
  onSubmit,
}: {
  pending: boolean;
  error: string | null;
  /** The own food being edited; none when one is created. */
  food?: FoodProductPayload | null;
  onSubmit: (form: FormData) => void;
}) {
  const value = (field: keyof FoodProductPayload) =>
    food ? targetFieldValue(food[field] as number | null | undefined) : undefined;
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
      }}
    >
      <FoodTextField defaultValue={food?.name} label="Nom" name="name" required />
      <FoodTextField defaultValue={food?.brand ?? undefined} label="Marque" name="brand" />
      <p className="text-label text-muted-foreground">Pour 100 g</p>
      <div className="grid grid-cols-2 gap-3">
        <FoodNumberField
          defaultValue={value('kcalPer100g')}
          label="Calories"
          name="kcalPer100g"
          unit="kcal"
          required
        />
        <FoodNumberField
          defaultValue={value('proteinPer100g')}
          label="Protéines"
          name="proteinPer100g"
          unit="g"
          required
        />
        <FoodNumberField
          defaultValue={value('carbsPer100g')}
          label="Glucides"
          name="carbsPer100g"
          unit="g"
          required
        />
        <FoodNumberField
          defaultValue={value('fatPer100g')}
          label="Lipides"
          name="fatPer100g"
          unit="g"
          required
        />
        <FoodNumberField
          defaultValue={value('servingGrams')}
          label="Portion habituelle"
          name="servingGrams"
          unit="g"
        />
      </div>
      {food ? (
        <p className="text-muted-foreground text-xs">Tes repas déjà notés gardent leurs valeurs.</p>
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex justify-end">
        <Button disabled={pending} type="submit" variant="highlight">
          {food ? 'Enregistrer' : 'Créer l’aliment'}
        </Button>
      </div>
    </form>
  );
}
