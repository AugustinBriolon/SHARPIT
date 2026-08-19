import { format, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getMfpAccount } from '@/lib/integrations/myfitnesspal-sync';
import type {
  NutritionDaySummary,
  NutritionMealSummary,
  NutritionViewModel,
} from '@/core/presentation/nutrition-view-model';

export async function buildNutritionViewModel(
  referenceDate = new Date(),
): Promise<NutritionViewModel> {
  const account = await getMfpAccount().catch(() => null);
  const connected = Boolean(account);

  if (!connected) {
    return { connected: false, today: null, history: [], averages: null };
  }

  const todayStr = format(referenceDate, 'yyyy-MM-dd');
  const from = subDays(referenceDate, 6);

  const rows = await prisma.dailyNutrition.findMany({
    where: {
      date: { gte: new Date(`${format(from, 'yyyy-MM-dd')}T00:00:00Z`) },
    },
    orderBy: { date: 'desc' },
  });

  const history: NutritionDaySummary[] = rows.map((r) => ({
    date: format(r.date, 'yyyy-MM-dd'),
    calories: r.calories,
    protein: r.protein,
    carbohydrates: r.carbohydrates,
    fat: r.fat,
    fiber: r.fiber,
    sugar: r.sugar,
    meals: (r.meals as NutritionMealSummary[]) ?? [],
  }));

  const today = history.find((d) => d.date === todayStr) ?? null;

  const averages =
    history.length > 0
      ? {
          calories: Math.round(history.reduce((s, d) => s + d.calories, 0) / history.length),
          protein:
            Math.round((history.reduce((s, d) => s + d.protein, 0) / history.length) * 10) / 10,
          carbohydrates:
            Math.round((history.reduce((s, d) => s + d.carbohydrates, 0) / history.length) * 10) /
            10,
          fat: Math.round((history.reduce((s, d) => s + d.fat, 0) / history.length) * 10) / 10,
        }
      : null;

  return { connected, today, history, averages };
}
