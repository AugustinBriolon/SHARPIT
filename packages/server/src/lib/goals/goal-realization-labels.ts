/**
 * Metric realization labels for Cap position audit — pure presentation.
 */

import { isGoalReached } from '@sharpit/server/lib/goals/goals';
import {
  formatGoalDisplayValue,
  parseGoalMetricConfig,
} from '@sharpit/server/lib/goals/goal-metric-config';
import { isSet } from '@sharpit/shared/value';

export type GoalRealizationLabels = {
  readonly currentLabel: string | null;
  readonly targetLabel: string | null;
  readonly gapLabel: string | null;
  readonly pairLabel: string | null;
};

export function buildGoalRealizationLabels(goal: {
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
  metricKey: string | null;
  lowerIsBetter: boolean;
  startValue?: number | null;
}): GoalRealizationLabels {
  const config = parseGoalMetricConfig(goal.metricKey);
  const currentLabel = isSet(goal.currentValue)
    ? formatGoalDisplayValue(goal.currentValue, goal.unit, config)
    : null;
  const targetLabel = isSet(goal.targetValue)
    ? formatGoalDisplayValue(goal.targetValue, goal.unit, config)
    : null;

  if (!isSet(goal.currentValue) || !isSet(goal.targetValue)) {
    return { currentLabel, targetLabel, gapLabel: null, pairLabel: null };
  }

  const pairLabel = `${currentLabel} / ${targetLabel}`;
  if (isGoalReached({ ...goal, startValue: goal.startValue ?? null })) {
    return { currentLabel, targetLabel, gapLabel: 'Cible atteinte', pairLabel };
  }

  const delta = Math.abs(goal.targetValue - goal.currentValue);
  const deltaLabel = formatGoalDisplayValue(delta, goal.unit, config);
  const gapLabel = goal.lowerIsBetter
    ? `${deltaLabel} encore à gagner sur la mesure`
    : `${deltaLabel} restants jusqu’à la cible`;

  return { currentLabel, targetLabel, gapLabel, pairLabel };
}
