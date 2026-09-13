'use client';

import { GoalAdvancementPanel } from '@/components/today/rich/goal-advancement-panel';
import { useGoalAdvancement } from '@/hooks/use-goal-advancement';

/**
 * Quiet Suivi lab-note under Plan destination — client island only.
 * Keeps `PlanDestinationPlate` free of the client boundary (RSC-safe plaque).
 */
export function DestinationAdvancementNote() {
  const { view, pending } = useGoalAdvancement();
  if (pending || !view) {
    return null;
  }
  return <GoalAdvancementPanel density="note" view={view} />;
}
