'use client';

import { GoalHorizon, GoalKind } from '@prisma/client';
import {
  buildLegacyMetricPayload,
  buildRacePayload,
  GoalLegacyMetricEditForm,
  GoalRaceEditForm,
  GoalStructuredMetricEditForm,
} from '@/components/goals/dialogs/goal-dialog-edit-forms';
import type { MetricGoalFormResult } from '@/components/goals/dialogs/metric-goal-form';
import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';

type GoalFormVariant = 'race' | 'performance' | 'period' | 'legacy';

export function GoalDialogEditView({
  variant,
  goal,
  error,
  pending,
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
}: {
  variant: GoalFormVariant;
  goal?: GoalForEdit | null;
  error: string | null;
  pending: boolean;
  priority: string;
  metricFormId: string;
  legacyHorizon: GoalHorizon;
  legacyLowerIsBetter: boolean;
  onClose: () => void;
  onPriorityChange: (value: string) => void;
  onError: (message: string | null) => void;
  onRaceSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onLegacySubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onStructuredSubmit: (result: MetricGoalFormResult) => void;
  onHorizonChange: (horizon: GoalHorizon) => void;
  onLowerIsBetterChange: (value: boolean) => void;
}) {
  if (variant === 'race') {
    return (
      <GoalRaceEditForm
        error={error}
        goal={goal}
        pending={pending}
        priority={priority}
        onClose={onClose}
        onPriorityChange={onPriorityChange}
        onSubmit={onRaceSubmit}
      />
    );
  }

  if (variant === 'performance' || variant === 'period') {
    return (
      <GoalStructuredMetricEditForm
        error={error}
        goal={goal}
        metricFormId={metricFormId}
        pending={pending}
        variant={variant}
        onClose={onClose}
        onError={onError}
        onSubmit={onStructuredSubmit}
      />
    );
  }

  return (
    <GoalLegacyMetricEditForm
      error={error}
      goal={goal}
      legacyHorizon={legacyHorizon}
      legacyLowerIsBetter={legacyLowerIsBetter}
      pending={pending}
      onClose={onClose}
      onHorizonChange={onHorizonChange}
      onLowerIsBetterChange={onLowerIsBetterChange}
      onSubmit={onLegacySubmit}
    />
  );
}

export { buildLegacyMetricPayload, buildRacePayload, GoalKind };
