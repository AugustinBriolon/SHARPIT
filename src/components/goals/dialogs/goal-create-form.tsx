'use client';

import { useId, useState } from 'react';
import {
  buildRaceCreatePayload,
  GoalCreateRaceForm,
} from '@/components/goals/dialogs/goal-create-race-form';
import {
  GoalCreateVariantPicker,
  type GoalFormVariant,
} from '@/components/goals/dialogs/goal-create-variant-picker';
import { GoalCreateMetricSection } from '@/components/goals/dialogs/goal-create-metric-section';
import type { MetricGoalFormResult } from '@/components/goals/dialogs/metric-goal-form';
import { Button } from '@/components/ui/button';
import { GoalKind } from '@prisma/client';
import type { GoalPayload } from '@/hooks/use-data';
import type { PracticedSportId } from '@/lib/practiced-sports';
import { useResolvedPracticedSports } from '@/components/practiced-sports/use-resolved-practiced-sports';

export type GoalCreateFormProps = {
  submitLabel?: string;
  skipLabel?: string;
  onSkip?: () => void;
  onCancel?: () => void;
  onSubmit: (payload: GoalPayload) => void | Promise<void>;
  error?: string | null;
  /** When set, metric sport pickers are filtered to these practiced sports. */
  practicedSports?: readonly PracticedSportId[];
};

export function GoalCreateForm({
  submitLabel = 'Créer',
  skipLabel,
  onSkip,
  onCancel,
  onSubmit,
  error: externalError,
  practicedSports,
}: GoalCreateFormProps) {
  const metricFormId = useId();
  const resolvedSports = useResolvedPracticedSports(practicedSports);
  const [variant, setVariant] = useState<GoalFormVariant>('race');
  const [priority, setPriority] = useState<string>('A');
  const [error, setError] = useState<string | null>(null);

  const displayError = externalError ?? error;

  async function submitPayload(payload: GoalPayload) {
    setError(null);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    }
  }

  async function handleRaceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await submitPayload(buildRaceCreatePayload(new FormData(e.currentTarget), priority));
  }

  async function handleStructuredMetricSubmit(result: MetricGoalFormResult) {
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
  }

  function renderFormActions(submitType: 'submit' | { form: string }) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {skipLabel && onSkip ? (
          <Button className="sm:mr-auto" type="button" variant="ghost" onClick={onSkip}>
            {skipLabel}
          </Button>
        ) : null}
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        ) : null}
        <Button form={typeof submitType === 'object' ? submitType.form : undefined} type="submit">
          {submitLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GoalCreateVariantPicker variant={variant} onVariantChange={setVariant} />

      {variant === 'race' ? (
        <>
          <GoalCreateRaceForm
            priority={priority}
            onPriorityChange={setPriority}
            onSubmit={(e) => void handleRaceSubmit(e)}
          />
          {displayError ? (
            <p className="text-destructive text-sm" role="alert">
              {displayError}
            </p>
          ) : null}
          {renderFormActions('submit')}
        </>
      ) : (
        <>
          <GoalCreateMetricSection
            metricFormId={metricFormId}
            practicedSports={resolvedSports}
            variant={variant}
            onError={setError}
            onSubmit={(result) => void handleStructuredMetricSubmit(result)}
          />
          {displayError ? (
            <p className="text-destructive text-sm" role="alert">
              {displayError}
            </p>
          ) : null}
          {renderFormActions({ form: metricFormId })}
        </>
      )}
    </div>
  );
}
