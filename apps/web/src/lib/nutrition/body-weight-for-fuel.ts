import { parseISO, subDays } from 'date-fns';

import { FUEL_BODY_WEIGHT_LOOKBACK_DAYS } from '@/core/features/extractors/fuel-extractor';
import { prisma } from '@/lib/prisma';

export { FUEL_BODY_WEIGHT_LOOKBACK_DAYS };

/**
 * Latest provider weigh-in within the lookback window ending on `trainingDayId`.
 * Used when the observation registry lags BodyCompositionMeasurement.
 */
export async function getLatestBodyWeightKg(
  athleteId: string,
  trainingDayId: string,
  lookbackDays: number = FUEL_BODY_WEIGHT_LOOKBACK_DAYS,
): Promise<number | null> {
  const until = new Date(`${trainingDayId}T23:59:59.999Z`);
  const since = subDays(parseISO(trainingDayId), lookbackDays);

  const row = await prisma.bodyCompositionMeasurement.findFirst({
    where: {
      athleteId,
      measuredAt: { gte: since, lte: until },
      weightKg: { gt: 0 },
    },
    orderBy: { measuredAt: 'desc' },
    select: { weightKg: true },
  });

  return row?.weightKg ?? null;
}

export function macroGPerKg(grams: number, weightKg: number | null): number | null {
  if (weightKg === undefined || weightKg === null || weightKg <= 0) {
    return null;
  }
  return Math.round((grams / weightKg) * 100) / 100;
}
