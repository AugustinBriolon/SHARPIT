'use client';

import { useId } from 'react';
import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';
import {
  createMetricGoalSubmitHandler,
  resolvePerformanceSport,
  resolvePeriodSport,
  useMetricGoalFormEffects,
} from '@/components/goals/dialogs/metric-goal-form-logic';
import { useAllowedMetricSports } from '@/components/goals/dialogs/use-allowed-metric-sports';
import { useMetricGoalFormState } from '@/components/goals/dialogs/use-metric-goal-form-state';
import type { GoalMetricTemplate } from '@/lib/goals/goal-metric-config';
import type { PracticedSportId } from '@/lib/practiced-sports';
import type { MetricGoalFormResult } from '@/components/goals/dialogs/metric-goal-form';

type MetricGoalFormSetupInput = {
  template: Exclude<GoalMetricTemplate, never>;
  goal?: GoalForEdit | null;
  formId: string;
  onError: (message: string | null) => void;
  onSubmit: (result: MetricGoalFormResult) => void | Promise<void>;
  practicedSports?: readonly PracticedSportId[];
  compact?: boolean;
  onReadyChange?: (ready: boolean) => void;
};

export function useMetricGoalFormSetup(input: MetricGoalFormSetupInput) {
  const uid = useId();
  const { allowedPerformanceSports, allowedPeriodSports } = useAllowedMetricSports(
    input.practicedSports,
  );
  const state = useMetricGoalFormState(input.goal);
  const sport = resolvePerformanceSport(state.sport, allowedPerformanceSports);
  const periodSport = resolvePeriodSport(state.periodSport, allowedPeriodSports);

  useMetricGoalFormEffects({
    state,
    sport,
    periodSport,
    compact: input.compact ?? false,
    onReadyChange: input.onReadyChange,
    template: input.template,
  });

  return {
    uid,
    formId: input.formId,
    goal: input.goal,
    template: input.template,
    sport,
    periodSport,
    allowedPerformanceSports,
    allowedPeriodSports,
    state,
    handleSubmit: createMetricGoalSubmitHandler({
      template: input.template,
      compact: input.compact ?? false,
      sport,
      periodSport,
      state,
      onError: input.onError,
      onSubmit: input.onSubmit,
    }),
  };
}
