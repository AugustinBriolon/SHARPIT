import { GoalHorizon, GoalPriority } from '@prisma/client';
import { differenceInCalendarDays } from 'date-fns';

export interface GoalLike {
  startValue: number | null;
  currentValue: number | null;
  targetValue: number | null;
  lowerIsBetter: boolean;
}

export function computeGoalProgress(goal: GoalLike): number | null {
  const { startValue, currentValue, targetValue, lowerIsBetter } = goal;
  if (currentValue == null || targetValue == null) return null;

  if (lowerIsBetter) {
    if (currentValue <= targetValue) return 100;
    const baseline = startValue ?? Math.max(currentValue, targetValue * 1.15);
    const span = baseline - targetValue;
    if (span <= 0) return 0;
    const progressed = baseline - currentValue;
    return Math.max(0, Math.min(100, Math.round((progressed / span) * 100)));
  }

  const start = startValue ?? 0;
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
    return remaining >= 0 ? 'Atteint' : `${Math.abs(remaining)} à gagner`;
  }
  return remaining <= 0 ? 'Atteint' : `${remaining} restant`;
}

export const horizonLabels: Record<GoalHorizon, string> = {
  LONG_TERM: 'Long terme',
  MEDIUM_TERM: 'Moyen terme',
  SHORT_TERM: 'Court terme',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuel',
  YEARLY: 'Annuel',
};

export const horizonOrder: GoalHorizon[] = [
  GoalHorizon.WEEKLY,
  GoalHorizon.MONTHLY,
  GoalHorizon.YEARLY,
  GoalHorizon.SHORT_TERM,
  GoalHorizon.MEDIUM_TERM,
  GoalHorizon.LONG_TERM,
];

export const priorityLabels: Record<GoalPriority, string> = {
  A: 'Objectif A',
  B: 'Objectif B',
  C: 'Objectif C',
};

export const priorityDescriptions: Record<GoalPriority, string> = {
  A: 'Course principale — affûtage complet',
  B: 'Course intermédiaire — affûtage léger',
  C: "Test / entraînement — pas d'affûtage",
};

export const priorityOrder: GoalPriority[] = [GoalPriority.A, GoalPriority.B, GoalPriority.C];

export const priorityAccent: Record<GoalPriority, string> = {
  A: '#ef4444',
  B: '#f59e0b',
  C: '#64748b',
};
