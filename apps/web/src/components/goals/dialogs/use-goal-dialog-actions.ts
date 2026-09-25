import { useGoalMutations, type GoalPayload } from '@/hooks/use-data';
import { GoalKind } from '@prisma/client';
import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';
import {
  buildLegacyMetricPayload,
  buildRacePayload,
} from '@/components/goals/dialogs/goal-dialog-edit-forms';
import type { MetricGoalFormResult } from '@/components/goals/dialogs/metric-goal-form';

export function useGoalDialogActions({
  goal,
  isEdit,
  priority,
  legacyHorizon,
  legacyLowerIsBetter,
  onClose,
  setError,
}: {
  goal?: GoalForEdit | null;
  isEdit: boolean;
  priority: string;
  legacyHorizon: import('@prisma/client').GoalHorizon;
  legacyLowerIsBetter: boolean;
  onClose: () => void;
  setError: (error: string | null) => void;
}) {
  const { create, update } = useGoalMutations();
  const pending = create.isPending || update.isPending;

  async function submitPayload(payload: GoalPayload) {
    if (isEdit && goal) {
      update.mutate(
        { id: goal.id, data: payload },
        {
          onError: (err) => {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
          },
        },
      );
    } else {
      create.mutate(payload, {
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        },
      });
    }
    onClose();
  }

  async function handleRaceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    await submitPayload(buildRacePayload(new FormData(e.currentTarget), priority));
  }

  async function handleLegacyMetricSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    await submitPayload(
      buildLegacyMetricPayload(new FormData(e.currentTarget), legacyHorizon, legacyLowerIsBetter),
    );
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

  return {
    pending,
    handleRaceSubmit,
    handleLegacyMetricSubmit,
    handleStructuredMetricSubmit,
    submitPayload,
  };
}
