'use client';

import { useCallback } from 'react';
import { DockedActionBar } from '@/components/ui/docked-action-bar';
import {
  GoalCreateCancelAction,
  GoalCreateSkipAction,
  GoalCreateSubmitAction,
} from '@/components/goals/dialogs/goal-create-form-action-controls';
import {
  buildRaceCreatePayload,
  GoalCreateRaceForm,
} from '@/components/goals/dialogs/goal-create-race-form';
import { GoalCreateMetricSection } from '@/components/goals/dialogs/goal-create-metric-section';
import type { MetricGoalFormResult } from '@/components/goals/dialogs/metric-goal-form';
import { GoalKind } from '@prisma/client';
import type { GoalPayload } from '@/hooks/use-data';
import type { PracticedSportId } from '@/lib/practiced-sports';

export function useGoalCreateSubmitHandlers(
  onSubmit: (payload: GoalPayload) => void | Promise<void>,
  priority: string,
  setError: (message: string | null) => void,
) {
  const submitPayload = useCallback(
    async (payload: GoalPayload) => {
      setError(null);
      try {
        await onSubmit(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
    },
    [onSubmit, setError],
  );

  const handleRaceSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      await submitPayload(buildRaceCreatePayload(new FormData(e.currentTarget), priority));
    },
    [priority, submitPayload],
  );

  const handleStructuredMetricSubmit = useCallback(
    async (result: MetricGoalFormResult) => {
      await submitPayload({
        title: result.title,
        kind: GoalKind.METRIC,
        horizon: result.horizon,
        metricKey: result.metricKey,
        startValue: result.startValue,
        currentValue: result.currentValue,
        targetValue: result.targetValue,
        unit: result.unit,
        lowerIsBetter: result.lowerIsBetter,
        notes: result.notes,
        targetDate: result.targetDate,
      });
    },
    [submitPayload],
  );

  return { handleRaceSubmit, handleStructuredMetricSubmit };
}

export function GoalCreateBranchFooter({
  form,
  displayError,
  submitLabel,
  submitReady,
  skipLabel,
  footerVariant = 'inline',
  onSkip,
  onCancel,
}: {
  form: string;
  displayError: string | null;
  submitLabel: string;
  submitReady: boolean;
  skipLabel?: string;
  /** `docked` pins the row to the bottom of the screen (onboarding). */
  footerVariant?: 'inline' | 'docked';
  onSkip?: () => void;
  onCancel?: () => void;
}) {
  // The submit button carries `form={id}`, so it stays wired to the form even
  // when the bar is lifted out of the form's own box.
  const actions = (
    <GoalCreateFormActions
      form={form}
      fullWidthOnMobile={footerVariant === 'docked'}
      skipLabel={skipLabel}
      submitLabel={submitLabel}
      submitReady={submitReady}
      onCancel={onCancel}
      onSkip={onSkip}
    />
  );

  return (
    <>
      <GoalCreateFormError message={displayError} />
      {footerVariant === 'docked' ? <DockedActionBar>{actions}</DockedActionBar> : actions}
    </>
  );
}

type GoalCreateRaceBranchProps = {
  compact: boolean;
  raceFormId: string;
  priority: string;
  displayError: string | null;
  submitLabel: string;
  submitReady: boolean;
  skipLabel?: string;
  footerVariant?: 'inline' | 'docked';
  onSkip?: () => void;
  onCancel?: () => void;
  onPriorityChange: (priority: string) => void;
  onRaceReady?: (ready: boolean) => void;
  onRaceSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export function GoalCreateRaceBranch({
  compact,
  raceFormId,
  priority,
  displayError,
  submitLabel,
  submitReady,
  skipLabel,
  footerVariant,
  onSkip,
  onCancel,
  onPriorityChange,
  onRaceReady,
  onRaceSubmit,
}: GoalCreateRaceBranchProps) {
  return (
    <>
      <GoalCreateRaceForm
        compact={compact}
        formId={raceFormId}
        priority={priority}
        onPriorityChange={onPriorityChange}
        onReadyChange={onRaceReady}
        onSubmit={(e) => void onRaceSubmit(e)}
      />
      <GoalCreateBranchFooter
        displayError={displayError}
        footerVariant={footerVariant}
        form={raceFormId}
        skipLabel={skipLabel}
        submitLabel={submitLabel}
        submitReady={submitReady}
        onCancel={onCancel}
        onSkip={onSkip}
      />
    </>
  );
}

type GoalCreateMetricBranchProps = {
  compact: boolean;
  metricFormId: string;
  variant: 'performance' | 'period';
  practicedSports: readonly PracticedSportId[];
  displayError: string | null;
  submitLabel: string;
  submitReady: boolean;
  skipLabel?: string;
  footerVariant?: 'inline' | 'docked';
  onSkip?: () => void;
  onCancel?: () => void;
  onError: (message: string | null) => void;
  onMetricReady?: (ready: boolean) => void;
  onMetricSubmit: (result: MetricGoalFormResult) => void | Promise<void>;
};

export function GoalCreateMetricBranch({
  compact,
  metricFormId,
  variant,
  practicedSports,
  displayError,
  submitLabel,
  submitReady,
  skipLabel,
  footerVariant,
  onSkip,
  onCancel,
  onError,
  onMetricReady,
  onMetricSubmit,
}: GoalCreateMetricBranchProps) {
  return (
    <>
      <GoalCreateMetricSection
        compact={compact}
        metricFormId={metricFormId}
        practicedSports={practicedSports}
        variant={variant}
        onError={onError}
        onReadyChange={onMetricReady}
        onSubmit={(result) => void onMetricSubmit(result)}
      />
      <GoalCreateBranchFooter
        displayError={displayError}
        footerVariant={footerVariant}
        form={metricFormId}
        skipLabel={skipLabel}
        submitLabel={submitLabel}
        submitReady={submitReady}
        onCancel={onCancel}
        onSkip={onSkip}
      />
    </>
  );
}

export function GoalCreateFormActions({
  form,
  submitLabel,
  submitReady,
  skipLabel,
  fullWidthOnMobile = false,
  onSkip,
  onCancel,
}: {
  form: string;
  submitLabel: string;
  submitReady: boolean;
  skipLabel?: string;
  /** Matches the wizard's docked bar — same Passer / Continuer chrome as every step. */
  fullWidthOnMobile?: boolean;
  onSkip?: () => void;
  onCancel?: () => void;
}) {
  const docked = fullWidthOnMobile;
  const actions = (
    <>
      <GoalCreateSkipAction docked={docked} skipLabel={skipLabel} onSkip={onSkip} />
      <GoalCreateCancelAction docked={docked} onCancel={onCancel} />
      <GoalCreateSubmitAction
        docked={docked}
        form={form}
        submitLabel={submitLabel}
        submitReady={submitReady}
      />
    </>
  );

  if (docked) {
    return actions;
  }

  return <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">{actions}</div>;
}

export function GoalCreateFormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p className="text-destructive text-sm" role="alert">
      {message}
    </p>
  );
}
