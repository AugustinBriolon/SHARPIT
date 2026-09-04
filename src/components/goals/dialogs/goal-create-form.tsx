'use client';

import {
  GoalCreateMetricBranch,
  GoalCreateRaceBranch,
} from '@/components/goals/dialogs/goal-create-form-parts';
import { GoalCreateVariantPicker } from '@/components/goals/dialogs/goal-create-variant-picker';
import type { GoalCreateFormProps } from '@/components/goals/dialogs/goal-create-form-types';
import { useGoalCreateFormState } from '@/components/goals/dialogs/use-goal-create-form-state';

export type { GoalCreateFormProps } from '@/components/goals/dialogs/goal-create-form-types';

function GoalCreateRaceFormBody(
  props: ReturnType<typeof useGoalCreateFormState> & {
    compact: boolean;
    submitLabel: string;
    skipLabel?: string;
    onSkip?: () => void;
    onCancel?: () => void;
  },
) {
  return (
    <GoalCreateRaceBranch
      compact={props.compact}
      displayError={props.displayError}
      priority={props.priority}
      raceFormId={props.raceFormId}
      skipLabel={props.skipLabel}
      submitLabel={props.submitLabel}
      submitReady={props.submitReady}
      onCancel={props.onCancel}
      onPriorityChange={props.setPriority}
      onRaceReady={props.compact ? props.handleRaceReady : undefined}
      onRaceSubmit={props.handleRaceSubmit}
      onSkip={props.onSkip}
    />
  );
}

function GoalCreateMetricFormBody(
  props: ReturnType<typeof useGoalCreateFormState> & {
    compact: boolean;
    submitLabel: string;
    skipLabel?: string;
    onSkip?: () => void;
    onCancel?: () => void;
  },
) {
  if (props.variant === 'race') {
    return null;
  }
  return (
    <GoalCreateMetricBranch
      compact={props.compact}
      displayError={props.displayError}
      metricFormId={props.metricFormId}
      practicedSports={props.resolvedSports}
      skipLabel={props.skipLabel}
      submitLabel={props.submitLabel}
      submitReady={props.submitReady}
      variant={props.variant}
      onCancel={props.onCancel}
      onError={props.setError}
      onMetricReady={props.compact ? props.handleMetricReady : undefined}
      onMetricSubmit={props.handleStructuredMetricSubmit}
      onSkip={props.onSkip}
    />
  );
}

export function GoalCreateForm(props: GoalCreateFormProps) {
  const {
    submitLabel = 'Créer',
    skipLabel,
    onSkip,
    onCancel,
    onSubmit,
    error: externalError,
    practicedSports,
    compact = false,
  } = props;
  const form = useGoalCreateFormState({ onSubmit, practicedSports, compact, error: externalError });
  const bodyProps = { ...form, compact, submitLabel, skipLabel, onSkip, onCancel };

  return (
    <div className="space-y-4">
      <GoalCreateVariantPicker variant={form.variant} onVariantChange={form.setVariant} />
      {form.variant === 'race' ? (
        <GoalCreateRaceFormBody {...bodyProps} />
      ) : (
        <GoalCreateMetricFormBody {...bodyProps} />
      )}
    </div>
  );
}
