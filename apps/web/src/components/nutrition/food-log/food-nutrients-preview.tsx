import type { PortionNutrients } from '@sharpit/app/lib/nutrition/food-log/food-log-math';
import { ColoredMacroPills } from '@/components/nutrition/nutrition-macro-display';

/** The portion as it will be logged — the same reading the meal row then shows. */
export function FoodNutrientsPreview({ nutrients }: { nutrients: PortionNutrients | null }) {
  return (
    <div aria-live="polite" className="analysis-panel-alt rounded-lg px-3 py-2.5">
      {nutrients ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-data text-lg font-semibold tabular-nums">
            {Math.round(nutrients.kcal)} kcal
          </span>
          <ColoredMacroPills
            carbs={nutrients.carbs}
            fat={nutrients.fat}
            protein={nutrients.protein}
          />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Indique une quantité en grammes.</p>
      )}
    </div>
  );
}
