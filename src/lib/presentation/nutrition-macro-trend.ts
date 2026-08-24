import { subDays } from 'date-fns';
import type { NutritionMacroTrendViewModel } from '@/core/presentation/nutrition-macro-trend-view-model';
import type { NutritionMacroTrendGranularity } from '@/core/presentation/nutrition-macro-trend-view-model';
import { getMfpAccount } from '@/lib/integrations/myfitnesspal/myfitnesspal-sync';
import { buildNutritionMacroTrend, type MacroTrendRow } from '@/lib/nutrition/macro-trend';
import { prisma } from '@/lib/prisma';

/** Enough buckets to draw a trend without pulling in years of stale rows. */
const LOOKBACK_DAYS: Record<NutritionMacroTrendGranularity, number> = {
  week: 12 * 7, // ~12 weeks
  month: 12 * 31, // ~12 months
  year: 5 * 366, // ~5 years
};

export async function buildNutritionMacroTrendViewModel(
  athleteId: string,
  granularity: NutritionMacroTrendGranularity,
): Promise<NutritionMacroTrendViewModel> {
  const account = await getMfpAccount(athleteId).catch(() => null);
  const connected = Boolean(account);

  if (!connected) {
    return {
      connected: false,
      granularity,
      points: [],
      emptyState: {
        title: 'Nutrition indisponible',
        description: 'Connecte MyFitnessPal dans les réglages pour suivre tes apports.',
      },
    };
  }

  const from = subDays(new Date(), LOOKBACK_DAYS[granularity]);

  const rows = (await prisma.dailyNutrition.findMany({
    where: { athleteId, date: { gte: from } },
    orderBy: { date: 'asc' },
    select: { date: true, calories: true, protein: true, carbohydrates: true, fat: true },
  })) as MacroTrendRow[];

  const points = buildNutritionMacroTrend(rows, granularity);

  const emptyState =
    points.length === 0
      ? {
          title: 'Pas encore de tendance',
          description: 'Journalise quelques jours sur MyFitnessPal pour voir l’évolution.',
        }
      : null;

  return { connected, granularity, points, emptyState };
}
