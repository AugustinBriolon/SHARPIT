'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FOOD_MEAL_LABELS } from '@sharpit/app/lib/nutrition/food-log/food-log-day';
import { FOOD_MEALS, type FoodMealKey } from '@sharpit/app/lib/nutrition/food-log/food-log-math';

const MEAL_ITEMS = FOOD_MEALS.map((meal) => ({ value: meal, label: FOOD_MEAL_LABELS[meal] }));

export function FoodMealSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: FoodMealKey;
  onChange: (meal: FoodMealKey) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={id}>
        Repas
      </label>
      <Select
        items={MEAL_ITEMS}
        value={value}
        onValueChange={(next) => next && onChange(next as FoodMealKey)}
      >
        <SelectTrigger className="w-full" id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MEAL_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
