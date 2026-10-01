'use client';

import { Plus } from 'lucide-react';
import { Button } from '@sharpit/ui/components/ui/button';
import { isTempId } from '@/client/query/optimistic';
import { ColoredMacroPills } from '@/components/nutrition/nutrition-macro-display';
import { FoodEntryRow } from '@/components/nutrition/food-log/food-entry-row';
import type {
  FoodLogEntryPayload,
  FoodLogMealGroup,
} from '@sharpit/app/lib/nutrition/food-log/food-log-day';
import type { FoodMealKey } from '@sharpit/app/lib/nutrition/food-log/food-log-math';

export type FoodEntryActions = {
  onAdd: (meal: FoodMealKey) => void;
  onEdit: (entry: FoodLogEntryPayload) => void;
  onDelete: (entry: FoodLogEntryPayload) => void;
};

function MealPlateHeader({ group, onAdd }: { group: FoodLogMealGroup; onAdd: () => void }) {
  const hasEntries = group.entries.length > 0;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{group.label}</p>
        {hasEntries ? (
          <ColoredMacroPills carbs={group.carbs} fat={group.fat} protein={group.protein} />
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {hasEntries ? (
          <span className="text-data text-sm font-semibold tabular-nums">{group.kcal} kcal</span>
        ) : null}
        <Button
          aria-label={`Ajouter un aliment : ${group.label}`}
          size="sm"
          type="button"
          variant="ghost"
          onClick={onAdd}
        >
          <Plus aria-hidden />
          Ajouter
        </Button>
      </div>
    </div>
  );
}

/** One meal of the logged day: its totals, its entries, and where to add to it. */
export function FoodMealPlate({
  group,
  actions,
}: {
  group: FoodLogMealGroup;
  actions: FoodEntryActions;
}) {
  return (
    <div className="border-analysis-border/20 rounded-xl border px-3 py-3 sm:px-4">
      <MealPlateHeader group={group} onAdd={() => actions.onAdd(group.meal)} />
      {group.entries.length > 0 ? (
        <ul className="border-analysis-border/15 divide-analysis-border/15 mt-2 divide-y border-t">
          {group.entries.map((entry) => (
            <FoodEntryRow
              key={entry.id}
              entry={entry}
              saving={isTempId(entry.id)}
              onDelete={actions.onDelete}
              onEdit={actions.onEdit}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
