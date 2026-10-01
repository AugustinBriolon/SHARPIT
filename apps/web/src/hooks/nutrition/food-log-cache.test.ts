import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/client/query/keys';
import { toast } from '@/components/ui/toast';
import { patchFoodLogDay, refreshFoodLogReaders, rollbackFoodLogDay } from './food-log-cache';
import type { FoodLogDayPayload } from '@sharpit/app/lib/nutrition/food-log/food-log-day';

vi.mock('@/components/ui/toast', () => ({ toast: { error: vi.fn() } }));

const DAY_ID = '2026-10-01';
const DAY: FoodLogDayPayload = {
  trainingDayId: DAY_ID,
  entries: [],
  targets: { kcal: 2600, proteinG: null, carbsG: null, fatG: null },
  recent: [],
};

describe('food log day cache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.foodLogDay(DAY_ID), DAY);
  });

  it('patches the day at once and restores it, with a toast, when the write fails', async () => {
    const context = await patchFoodLogDay(queryClient, DAY_ID, (day) => ({
      ...day,
      targets: { ...day.targets, kcal: 3000 },
    }));
    expect(
      queryClient.getQueryData<FoodLogDayPayload>(queryKeys.foodLogDay(DAY_ID))?.targets.kcal,
    ).toBe(3000);

    rollbackFoodLogDay(queryClient, DAY_ID, context, new Error('Saisie invalide'));
    expect(queryClient.getQueryData(queryKeys.foodLogDay(DAY_ID))).toEqual(DAY);
    expect(toast.error).toHaveBeenCalledWith("L'action a échoué, rien n'a été enregistré.", {
      description: 'Saisie invalide',
    });
  });

  it('refreshes every reader of the recomputed day', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    await refreshFoodLogReaders(queryClient, DAY_ID);

    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      queryKeys.foodLogDay(DAY_ID),
      queryKeys.presentationNutritionAll,
      queryKeys.presentationDataDaysDomain('nutrition'),
    ]);
  });

  it('the nutrition prefix covers the page day and the Today card day', () => {
    const prefix = queryKeys.presentationNutritionAll;
    expect(queryKeys.presentationNutrition(DAY_ID).slice(0, prefix.length)).toEqual([...prefix]);
    expect(
      queryKeys.presentationDataDays('nutrition', '2026-09-01', '2026-10-01').slice(0, 3),
    ).toEqual([...queryKeys.presentationDataDaysDomain('nutrition')]);
  });
});
