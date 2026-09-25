'use client';

import { useEffect } from 'react';
import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';
import { ActivityType } from '@prisma/client';
import {
  parseChronoInput,
  parseTargetInput,
  type GoalMetricTemplate,
  type PeriodMeasure,
} from '@/lib/goals/goal-metric-config';
import type { PeriodSportOption } from '@/lib/practiced-sports';
import type { MetricGoalFormResult } from '@/components/goals/dialogs/metric-goal-form';
import {
  submitPerformanceMetricGoal,
  submitPeriodMetricGoal,
} from '@/components/goals/dialogs/metric-goal-form-submit';
import type { useMetricGoalFormState } from '@/components/goals/dialogs/use-metric-goal-form-state';

export function resolvePerformanceSport(
  current: ActivityType,
  allowed: readonly ActivityType[],
): ActivityType {
  if (allowed.includes(current)) {
    return current;
  }
  return allowed[0] ?? current;
}

export function resolvePeriodSport(current: string, allowed: readonly PeriodSportOption[]): string {
  if (allowed.includes(current as PeriodSportOption)) {
    return current;
  }
  return 'ALL';
}

export function useMetricGoalSportSync(
  state: ReturnType<typeof useMetricGoalFormState>,
  sport: ActivityType,
  periodSport: string,
) {
  useEffect(() => {
    if (sport !== state.sport) {
      state.handleSportChange(sport);
    }
  }, [sport, state.sport, state.handleSportChange]);

  useEffect(() => {
    if (periodSport !== state.periodSport) {
      state.setPeriodSport(periodSport);
    }
  }, [periodSport, state.periodSport, state.setPeriodSport]);
}

export function useMetricGoalFormEffects({
  state,
  sport,
  periodSport,
  compact,
  onReadyChange,
  template,
}: {
  state: ReturnType<typeof useMetricGoalFormState>;
  sport: ActivityType;
  periodSport: string;
  compact: boolean;
  onReadyChange: ((ready: boolean) => void) | undefined;
  template: GoalMetricTemplate;
}) {
  useMetricGoalSportSync(state, sport, periodSport);
  useMetricGoalCompactReady(compact, onReadyChange, template, state);
}

export function useMetricGoalCompactReady(
  compact: boolean,
  onReadyChange: ((ready: boolean) => void) | undefined,
  template: GoalMetricTemplate,
  state: ReturnType<typeof useMetricGoalFormState>,
) {
  useEffect(() => {
    if (!compact || !onReadyChange) {
      return;
    }
    if (template === 'performance') {
      onReadyChange(
        isCompactPerformanceReady({
          distanceM: state.resolveDistanceM(),
          chronoTarget: state.chronoTarget,
        }),
      );
      return;
    }
    onReadyChange(
      isCompactPeriodReady({
        measure: state.measure,
        periodTarget: state.periodTarget,
      }),
    );
  }, [
    compact,
    onReadyChange,
    state.chronoTarget,
    state.customDistanceKm,
    state.distancePreset,
    state.measure,
    state.periodTarget,
    template,
  ]);
}

export function isCompactPerformanceReady(input: {
  distanceM: number | null;
  chronoTarget: string;
}): boolean {
  const seconds = parseChronoInput(input.chronoTarget);
  return Boolean(input.distanceM && seconds && seconds > 0);
}

export function isCompactPeriodReady(input: {
  measure: PeriodMeasure;
  periodTarget: string;
}): boolean {
  return parseTargetInput(input.measure, input.periodTarget) !== null;
}

export function createMetricGoalSubmitHandler({
  template,
  compact,
  sport,
  periodSport,
  state,
  onError,
  onSubmit,
}: {
  template: GoalMetricTemplate;
  compact: boolean;
  sport: ActivityType;
  periodSport: string;
  state: ReturnType<typeof useMetricGoalFormState>;
  onError: (message: string | null) => void;
  onSubmit: (result: MetricGoalFormResult) => void | Promise<void>;
}) {
  return async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onError(null);
    const notes = (new FormData(e.currentTarget).get('notes') as string)?.trim() || null;

    if (template === 'performance') {
      await submitPerformanceMetricGoal({
        notes,
        sport,
        distanceM: state.resolveDistanceM(),
        chronoTarget: state.chronoTarget,
        performanceEndMode: state.performanceEndMode,
        performanceEndDate: state.performanceEndDate,
        customTitle: compact ? '' : state.customTitle,
        onError,
        onSubmit,
      });
      return;
    }

    await submitPeriodMetricGoal({
      notes,
      period: state.period,
      measure: state.measure,
      periodSport,
      periodTarget: state.periodTarget,
      periodEndDate: state.periodEndDate,
      customTitle: compact ? '' : state.customTitle,
      onError,
      onSubmit,
    });
  };
}

export type PerformanceMetricGoalFormBindings = {
  uid: string;
  formId: string;
  goal?: GoalForEdit | null;
  sport: ActivityType;
  allowedSports: readonly ActivityType[];
  distancePreset: string;
  customDistanceKm: string;
  chronoTarget: string;
  performanceEndMode: ReturnType<typeof useMetricGoalFormState>['performanceEndMode'];
  performanceEndDate: string;
  customTitle: string;
  suggestedPerformanceTitle: string;
  compact: boolean;
  onSportChange: ReturnType<typeof useMetricGoalFormState>['handleSportChange'];
  onDistancePresetChange: ReturnType<typeof useMetricGoalFormState>['setDistancePreset'];
  onCustomDistanceKmChange: ReturnType<typeof useMetricGoalFormState>['setCustomDistanceKm'];
  onChronoTargetChange: ReturnType<typeof useMetricGoalFormState>['setChronoTarget'];
  onPerformanceEndModeChange: ReturnType<typeof useMetricGoalFormState>['setPerformanceEndMode'];
  onPerformanceEndDateChange: ReturnType<typeof useMetricGoalFormState>['setPerformanceEndDate'];
  onCustomTitleChange: ReturnType<typeof useMetricGoalFormState>['setCustomTitle'];
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function buildPerformanceMetricGoalFormProps(
  state: ReturnType<typeof useMetricGoalFormState>,
  input: {
    uid: string;
    formId: string;
    goal?: GoalForEdit | null;
    sport: ActivityType;
    allowedSports: readonly ActivityType[];
    compact: boolean;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  },
): PerformanceMetricGoalFormBindings {
  return {
    uid: input.uid,
    formId: input.formId,
    goal: input.goal,
    sport: input.sport,
    allowedSports: input.allowedSports,
    distancePreset: state.distancePreset,
    customDistanceKm: state.customDistanceKm,
    chronoTarget: state.chronoTarget,
    performanceEndMode: state.performanceEndMode,
    performanceEndDate: state.performanceEndDate,
    customTitle: state.customTitle,
    suggestedPerformanceTitle: state.suggestedPerformanceTitle,
    compact: input.compact,
    onSportChange: state.handleSportChange,
    onDistancePresetChange: state.setDistancePreset,
    onCustomDistanceKmChange: state.setCustomDistanceKm,
    onChronoTargetChange: state.setChronoTarget,
    onPerformanceEndModeChange: state.setPerformanceEndMode,
    onPerformanceEndDateChange: state.setPerformanceEndDate,
    onCustomTitleChange: state.setCustomTitle,
    onSubmit: input.onSubmit,
  };
}

export type PeriodMetricGoalFormBindings = {
  uid: string;
  formId: string;
  goal?: GoalForEdit | null;
  period: ReturnType<typeof useMetricGoalFormState>['period'];
  measure: ReturnType<typeof useMetricGoalFormState>['measure'];
  periodSport: string;
  periodTarget: string;
  periodEndDate: string;
  customTitle: string;
  allowedSports: readonly PeriodSportOption[];
  compact: boolean;
  onPeriodChange: ReturnType<typeof useMetricGoalFormState>['setPeriod'];
  onMeasureChange: ReturnType<typeof useMetricGoalFormState>['setMeasure'];
  onPeriodSportChange: ReturnType<typeof useMetricGoalFormState>['setPeriodSport'];
  onPeriodTargetChange: ReturnType<typeof useMetricGoalFormState>['setPeriodTarget'];
  onPeriodEndDateChange: ReturnType<typeof useMetricGoalFormState>['setPeriodEndDate'];
  onCustomTitleChange: ReturnType<typeof useMetricGoalFormState>['setCustomTitle'];
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function buildPeriodMetricGoalFormProps(
  state: ReturnType<typeof useMetricGoalFormState>,
  input: {
    uid: string;
    formId: string;
    goal?: GoalForEdit | null;
    periodSport: string;
    allowedSports: readonly PeriodSportOption[];
    compact: boolean;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  },
): PeriodMetricGoalFormBindings {
  return {
    uid: input.uid,
    formId: input.formId,
    goal: input.goal,
    period: state.period,
    measure: state.measure,
    periodSport: input.periodSport,
    periodTarget: state.periodTarget,
    periodEndDate: state.periodEndDate,
    customTitle: state.customTitle,
    allowedSports: input.allowedSports,
    compact: input.compact,
    onPeriodChange: state.setPeriod,
    onMeasureChange: state.setMeasure,
    onPeriodSportChange: state.setPeriodSport,
    onPeriodTargetChange: state.setPeriodTarget,
    onPeriodEndDateChange: state.setPeriodEndDate,
    onCustomTitleChange: state.setCustomTitle,
    onSubmit: input.onSubmit,
  };
}
