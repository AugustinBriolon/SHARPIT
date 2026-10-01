'use client';

import { Button } from '@sharpit/ui/components/ui/button';
import { Input } from '@/components/ui/input';
import { FoodMealSelect } from '@/components/nutrition/food-log/food-meal-select';
import { FoodNumberField } from '@/components/nutrition/food-log/food-number-field';
import type { FoodMealKey } from '@sharpit/app/lib/nutrition/food-log/food-log-math';

export function FoodTextField({
  name,
  label,
  required = false,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  const id = `food-field-${name}`;
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <Input autoComplete="off" id={id} maxLength={120} name={name} required={required} />
    </div>
  );
}

/** A meal typed in by hand: what it was and its calories; macros if known. */
export function FoodQuickStep({
  meal,
  error,
  onMeal,
  onSubmit,
}: {
  meal: FoodMealKey;
  error: string | null;
  onMeal: (meal: FoodMealKey) => void;
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
      <div className="grid grid-cols-2 gap-3">
        <FoodNumberField label="Calories" name="kcal" unit="kcal" required />
        <FoodNumberField defaultValue="100" label="Quantité" name="grams" unit="g" required />
        <FoodNumberField label="Protéines" name="protein" unit="g" />
        <FoodNumberField label="Glucides" name="carbs" unit="g" />
        <FoodNumberField label="Lipides" name="fat" unit="g" />
      </div>
      <FoodMealSelect id="food-quick-meal" value={meal} onChange={onMeal} />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" variant="highlight">
          Ajouter
        </Button>
      </div>
    </form>
  );
}
