'use client';

import { GoalCreateForm } from '@/components/goals/dialogs/goal-create-form';
import { GoalDialogEditView } from '@/components/goals/dialogs/goal-dialog-edit-view';
import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';
import type { GoalPayload } from '@/hooks/use-data';
import { GoalHorizon } from '@prisma/client';

type GoalFormVariant = 'race' | 'performance' | 'period' | 'legacy';

export function GoalDialogBody({
  isEdit,
  goal,
  error,
  pending,
  variant,
  priority,
  metricFormId,
  legacyHorizon,
  legacyLowerIsBetter,
  onClose,
  onPriorityChange,
  onError,
  onRaceSubmit,
  onLegacySubmit,
  onStructuredSubmit,
  onHorizonChange,
  onLowerIsBetterChange,
  onCreateSubmit,
}: {
  isEdit: boolean;
  goal?: GoalForEdit | null;
  error: string | null;
  pending: boolean;
  variant: GoalFormVariant;
  priority: string;
  metricFormId: string;
  legacyHorizon: GoalHorizon;
  legacyLowerIsBetter: boolean;
  onClose: () => void;
  onPriorityChange: (value: string) => void;
  onError: (message: string | null) => void;
  onRaceSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onLegacySubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onStructuredSubmit: (
    result: import('@/components/goals/dialogs/metric-goal-form').MetricGoalFormResult,
  ) => void;
  onHorizonChange: (horizon: GoalHorizon) => void;
  onLowerIsBetterChange: (value: boolean) => void;
  onCreateSubmit: (payload: GoalPayload) => Promise<void>;
}) {
  if (!isEdit) {
    return (
      <GoalCreateForm
        error={error}
        submitLabel="Créer"
        onCancel={onClose}
        onSubmit={onCreateSubmit}
      />
    );
  }

  return (
    <GoalDialogEditView
      error={error}
      goal={goal}
      legacyHorizon={legacyHorizon}
      legacyLowerIsBetter={legacyLowerIsBetter}
      metricFormId={metricFormId}
      pending={pending}
      priority={priority}
      variant={variant}
      onClose={onClose}
      onError={onError}
      onHorizonChange={onHorizonChange}
      onLegacySubmit={onLegacySubmit}
      onLowerIsBetterChange={onLowerIsBetterChange}
      onPriorityChange={onPriorityChange}
      onRaceSubmit={onRaceSubmit}
      onStructuredSubmit={onStructuredSubmit}
    />
  );
}
