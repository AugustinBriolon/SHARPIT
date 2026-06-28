import { GoalHorizon } from "@prisma/client";
import { differenceInCalendarDays } from "date-fns";

export interface GoalLike {
  startValue: number | null;
  currentValue: number | null;
  targetValue: number | null;
  lowerIsBetter: boolean;
}

export function computeGoalProgress(goal: GoalLike): number | null {
  const { startValue, currentValue, targetValue, lowerIsBetter } = goal;
  if (currentValue == null || targetValue == null) return null;

  const start = startValue ?? (lowerIsBetter ? currentValue : 0);

  const span = targetValue - start;
  if (span === 0) return currentValue === targetValue ? 100 : 0;

  const progressed = currentValue - start;
  const ratio = progressed / span;
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

export function isGoalReached(goal: GoalLike): boolean {
  if (goal.currentValue == null || goal.targetValue == null) return false;
  return goal.lowerIsBetter
    ? goal.currentValue <= goal.targetValue
    : goal.currentValue >= goal.targetValue;
}

export function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  return differenceInCalendarDays(date, new Date());
}

export function formatRemaining(goal: GoalLike): string | null {
  if (goal.currentValue == null || goal.targetValue == null) return null;
  const remaining = goal.targetValue - goal.currentValue;
  if (goal.lowerIsBetter) {
    return remaining >= 0 ? "Atteint" : `${Math.abs(remaining)} à gagner`;
  }
  return remaining <= 0 ? "Atteint" : `${remaining} restant`;
}

export const horizonLabels: Record<GoalHorizon, string> = {
  LONG_TERM: "Long terme",
  MEDIUM_TERM: "Moyen terme",
  SHORT_TERM: "Court terme",
  WEEKLY: "Hebdomadaire",
};

export const horizonOrder: GoalHorizon[] = [
  GoalHorizon.LONG_TERM,
  GoalHorizon.MEDIUM_TERM,
  GoalHorizon.SHORT_TERM,
  GoalHorizon.WEEKLY,
];
