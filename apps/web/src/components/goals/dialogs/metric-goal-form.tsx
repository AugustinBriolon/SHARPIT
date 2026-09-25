'use client';

import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';
import { PeriodMetricGoalForm } from '@/components/goals/dialogs/metric-goal-period-form';
import { PerformanceMetricGoalForm } from '@/components/goals/dialogs/metric-goal-performance-form';
import {
  buildPerformanceMetricGoalFormProps,
  buildPeriodMetricGoalFormProps,
} from '@/components/goals/dialogs/metric-goal-form-logic';
import { useMetricGoalFormSetup } from '@/components/goals/dialogs/use-metric-goal-form-setup';
import { GoalHorizon } from '@prisma/client';
import type { GoalMetricTemplate } from '@/lib/goals/goal-metric-config';
import type { PracticedSportId } from '@/lib/practiced-sports';

export interface MetricGoalFormResult {
  title: string;
  horizon: GoalHorizon;
  metricKey: string;
  startValue: number | null;
  currentValue: number | null;
  targetValue: number;
  unit: string;
  lowerIsBetter: boolean;
  notes: string | null;
  targetDate: string | null;
}

interface MetricGoalFormProps {
  template: Exclude<GoalMetricTemplate, never>;
  goal?: GoalForEdit | null;
  onError: (message: string | null) => void;
  formId: string;
  onSubmit: (result: MetricGoalFormResult) => void | Promise<void>;
  practicedSports?: readonly PracticedSportId[];
  compact?: boolean;
  onReadyChange?: (ready: boolean) => void;
}

export {
  isCompactPerformanceReady,
  isCompactPeriodReady,
} from '@/components/goals/dialogs/metric-goal-form-logic';

export function MetricGoalForm(props: MetricGoalFormProps) {
  const setup = useMetricGoalFormSetup(props);

  if (setup.template === 'performance') {
    return (
      <PerformanceMetricGoalForm
        {...buildPerformanceMetricGoalFormProps(setup.state, {
          uid: setup.uid,
          formId: setup.formId,
          goal: setup.goal,
          sport: setup.sport,
          allowedSports: setup.allowedPerformanceSports,
          compact: props.compact ?? false,
          onSubmit: setup.handleSubmit,
        })}
      />
    );
  }

  return (
    <PeriodMetricGoalForm
      {...buildPeriodMetricGoalFormProps(setup.state, {
        uid: setup.uid,
        formId: setup.formId,
        goal: setup.goal,
        periodSport: setup.periodSport,
        allowedSports: setup.allowedPeriodSports,
        compact: props.compact ?? false,
        onSubmit: setup.handleSubmit,
      })}
    />
  );
}
