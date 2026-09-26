import type { Goal } from '@prisma/client';

/** A goal with its progress, as the web reads it (computed by `@sharpit/server/lib/goals`). */
export type EnrichedGoal<T extends Goal> = T & {
  currentValue: number | null;
  achieved: boolean;
  validatingActivityId: string | null;
  lastAchievedAt: Date | null;
};
