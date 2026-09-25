'use client';

import { useCallback, useId, useState } from 'react';
import type { GoalFormVariant } from '@/components/goals/dialogs/goal-create-variant-picker';
import { useGoalCreateSubmitHandlers } from '@/components/goals/dialogs/goal-create-form-parts';
import type { GoalCreateFormProps } from '@/components/goals/dialogs/goal-create-form-types';
import { useResolvedPracticedSports } from '@/components/practiced-sports/use-resolved-practiced-sports';

function compactSubmitReady(
  compact: boolean,
  variant: GoalFormVariant,
  raceReady: boolean,
  metricReady: boolean,
): boolean {
  if (!compact) {
    return true;
  }
  return variant === 'race' ? raceReady : metricReady;
}

export function useGoalCreateFormState({
  onSubmit,
  practicedSports,
  compact = false,
  error: externalError,
}: Pick<GoalCreateFormProps, 'onSubmit' | 'practicedSports' | 'compact' | 'error'>) {
  const metricFormId = useId();
  const raceFormId = useId();
  const resolvedSports = useResolvedPracticedSports(practicedSports);
  const [variant, setVariant] = useState<GoalFormVariant>('race');
  const [priority, setPriority] = useState<string>('A');
  const [error, setError] = useState<string | null>(null);
  const [raceReady, setRaceReady] = useState(false);
  const [metricReady, setMetricReady] = useState(false);

  const displayError = externalError ?? error;
  const submitReady = compactSubmitReady(compact, variant, raceReady, metricReady);

  const handleRaceReady = useCallback((ready: boolean) => {
    setRaceReady(ready);
  }, []);

  const handleMetricReady = useCallback((ready: boolean) => {
    setMetricReady(ready);
  }, []);

  const { handleRaceSubmit, handleStructuredMetricSubmit } = useGoalCreateSubmitHandlers(
    onSubmit,
    priority,
    setError,
  );

  return {
    metricFormId,
    raceFormId,
    resolvedSports,
    variant,
    setVariant,
    priority,
    setPriority,
    setError,
    displayError,
    submitReady,
    handleRaceReady,
    handleMetricReady,
    handleRaceSubmit,
    handleStructuredMetricSubmit,
  };
}
