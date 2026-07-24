import type { PrismaClient } from '@prisma/client';
import { resolveExerciseMedia } from '@/lib/exercises/resolve';

export type StrengthVisualEnrichmentResult = {
  checked: number;
  matched: number;
  alreadyLinked: number;
  unmatched: string[];
};

/**
 * For each strength set without a catalog id, try to match a visual and persist it.
 * Idempotent — safe on every activity open / Garmin sync.
 */
export async function enrichStrengthExerciseVisuals(
  prisma: PrismaClient,
  activityId: string,
): Promise<StrengthVisualEnrichmentResult> {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      type: true,
      strengthSets: {
        select: { id: true, exercise: true, exerciseCatalogId: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!activity || activity.type !== 'STRENGTH') {
    return { checked: 0, matched: 0, alreadyLinked: 0, unmatched: [] };
  }

  let matched = 0;
  let alreadyLinked = 0;
  const unmatched: string[] = [];
  const updates: Array<Promise<unknown>> = [];

  for (const set of activity.strengthSets) {
    if (set.exerciseCatalogId) {
      alreadyLinked += 1;
      continue;
    }

    const media = resolveExerciseMedia(set.exercise);
    if (!media) {
      unmatched.push(set.exercise);
      continue;
    }

    matched += 1;
    updates.push(
      prisma.strengthSet.update({
        where: { id: set.id },
        data: { exerciseCatalogId: media.catalogId },
      }),
    );
  }

  if (updates.length > 0) await Promise.all(updates);

  return {
    checked: activity.strengthSets.length,
    matched,
    alreadyLinked,
    unmatched,
  };
}

/** Resolve catalog id at write-time (Garmin / manual create). */
export function resolveExerciseCatalogId(exerciseLabel: string): string | null {
  return resolveExerciseMedia(exerciseLabel)?.catalogId ?? null;
}
