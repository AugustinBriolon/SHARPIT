'use client';

import { FoodAddDialog } from '@/components/nutrition/food-log/food-add-dialog';
import { FoodEntryEditDialog } from '@/components/nutrition/food-log/food-entry-edit-dialog';
import { FoodLogSection } from '@/components/nutrition/food-log/food-log-section';
import { NutritionTargetsDialog } from '@/components/nutrition/food-log/nutrition-targets-dialog';
import { useFoodAddFlow } from '@/components/nutrition/food-log/use-food-add-flow';
import { useFoodEntryEditor } from '@/components/nutrition/food-log/use-food-entry-editor';
import { useNutritionTargetsEditor } from '@/components/nutrition/food-log/use-nutrition-targets-editor';
import { useMfpSync } from '@/components/settings/integrations/mfp-content-hooks-parts';
import { useFoodLogDay } from '@/hooks/use-data';
import {
  foodLogDisplay,
  groupEntriesByMeal,
  mealForHour,
} from '@sharpit/app/lib/nutrition/food-log/food-log-day';
import type { NutritionMealSummary } from '@sharpit/app/presentation/nutrition-view-model';

function useNutritionFoodLog(trainingDayId: string) {
  const day = useFoodLogDay(trainingDayId);
  const entries = day.data?.entries ?? [];
  return {
    day,
    entries,
    groups: groupEntriesByMeal(entries),
    flow: useFoodAddFlow(trainingDayId, day.data?.recent ?? []),
    editor: useFoodEntryEditor(trainingDayId),
    targets: useNutritionTargetsEditor(trainingDayId),
  };
}

/** The Nutrition page's food log: the day's meals, and the dialogs that write them (ADR-061). */
export function NutritionFoodLog({
  trainingDayId,
  importedMeals,
  mfpConnected,
}: {
  trainingDayId: string;
  importedMeals: NutritionMealSummary[];
  mfpConnected: boolean;
}) {
  const { day, entries, groups, flow, editor, targets } = useNutritionFoodLog(trainingDayId);
  const mfp = useMfpSync();

  return (
    <>
      <FoodLogSection
        actions={{ onAdd: flow.start, onDelete: editor.remove, onEdit: editor.openEditor }}
        display={foodLogDisplay(entries.length, importedMeals.length)}
        groups={groups}
        importedMeals={importedMeals}
        loading={day.isPending}
        mfpSync={mfpConnected ? { syncing: mfp.syncing, onSync: mfp.handleSync } : null}
        unavailable={day.isError}
        onAddFirst={() => flow.start(mealForHour(new Date().getHours()))}
        onTargets={() => targets.setOpen(true)}
      />
      <FoodAddDialog flow={flow} />
      <FoodEntryEditDialog
        draft={editor.draft}
        entry={editor.entry}
        error={editor.error}
        onClose={editor.close}
        onDraftChange={editor.patchDraft}
        onSave={editor.save}
      />
      <NutritionTargetsDialog
        error={targets.error}
        open={targets.open}
        targets={day.data?.targets ?? null}
        onOpenChange={targets.setOpen}
        onSave={targets.save}
      />
    </>
  );
}
