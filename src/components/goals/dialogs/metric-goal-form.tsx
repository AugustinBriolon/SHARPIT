'use client';

import { useId } from 'react';
import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';
import { PeriodMetricGoalForm } from '@/components/goals/dialogs/metric-goal-period-form';
import { PerformanceMetricGoalForm } from '@/components/goals/dialogs/metric-goal-performance-form';
import {
  submitPerformanceMetricGoal,
  submitPeriodMetricGoal,
} from '@/components/goals/dialogs/metric-goal-form-submit';
import { useMetricGoalFormState } from '@/components/goals/dialogs/use-metric-goal-form-state';
import { GoalHorizon } from '@prisma/client';
import type { GoalMetricTemplate } from '@/lib/goals/goal-metric-config';

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
}

export function MetricGoalForm({ template, goal, onError, formId, onSubmit }: MetricGoalFormProps) {
  const uid = useId();
  const state = useMetricGoalFormState(goal);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onError(null);
    const notes = (new FormData(e.currentTarget).get('notes') as string)?.trim() || null;

    if (template === 'performance') {
      await submitPerformanceMetricGoal({
        notes,
        sport: state.sport,
        distanceM: state.resolveDistanceM(),
        chronoTarget: state.chronoTarget,
        performanceEndMode: state.performanceEndMode,
        performanceEndDate: state.performanceEndDate,
        customTitle: state.customTitle,
        onError,
        onSubmit,
      });
      return;
    }

    await submitPeriodMetricGoal({
      notes,
      period: state.period,
      measure: state.measure,
      periodSport: state.periodSport,
      periodTarget: state.periodTarget,
      periodEndDate: state.periodEndDate,
      customTitle: state.customTitle,
      onError,
      onSubmit,
    });
  }

  if (template === 'performance') {
    return (
      <PerformanceMetricGoalForm
        chronoTarget={state.chronoTarget}
        customDistanceKm={state.customDistanceKm}
        customTitle={state.customTitle}
        distancePreset={state.distancePreset}
        formId={formId}
        goal={goal}
        performanceEndDate={state.performanceEndDate}
        performanceEndMode={state.performanceEndMode}
        sport={state.sport}
        suggestedPerformanceTitle={state.suggestedPerformanceTitle}
        uid={uid}
        onChronoTargetChange={state.setChronoTarget}
        onCustomDistanceKmChange={state.setCustomDistanceKm}
        onCustomTitleChange={state.setCustomTitle}
        onDistancePresetChange={state.setDistancePreset}
        onPerformanceEndDateChange={state.setPerformanceEndDate}
        onPerformanceEndModeChange={state.setPerformanceEndMode}
        onSportChange={state.handleSportChange}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <PeriodMetricGoalForm
      customTitle={state.customTitle}
      formId={formId}
      goal={goal}
      measure={state.measure}
      period={state.period}
      periodEndDate={state.periodEndDate}
      periodSport={state.periodSport}
      periodTarget={state.periodTarget}
      uid={uid}
      onCustomTitleChange={state.setCustomTitle}
      onMeasureChange={state.setMeasure}
      onPeriodChange={state.setPeriod}
      onPeriodEndDateChange={state.setPeriodEndDate}
      onPeriodSportChange={state.setPeriodSport}
      onPeriodTargetChange={state.setPeriodTarget}
      onSubmit={handleSubmit}
    />
  );
}
