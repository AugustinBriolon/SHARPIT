import { prisma } from '@sharpit/db/client';

/**
 * Whether any row the athlete state is computed from was written since `since` — the tables
 * the provider syncs write to (activities, daily health, body composition, nutrition, planned
 * sessions) and the profile, which carries the thresholds Garmin imports.
 */
export async function hasEvidenceWrittenSince(athleteId: string, since: Date): Promise<boolean> {
  const recent = { athleteId, updatedAt: { gte: since } };
  const select = { id: true } as const;
  const hits = await Promise.all([
    prisma.activity.findFirst({ where: recent, select }),
    prisma.dailyHealth.findFirst({ where: recent, select }),
    prisma.bodyCompositionMeasurement.findFirst({ where: recent, select }),
    prisma.dailyNutrition.findFirst({ where: recent, select }),
    prisma.plannedSession.findFirst({ where: recent, select }),
    prisma.athleteProfile.findFirst({
      where: { id: athleteId, updatedAt: { gte: since } },
      select,
    }),
  ]);
  return hits.some((hit) => hit !== null);
}
