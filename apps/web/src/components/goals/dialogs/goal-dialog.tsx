'use client';

import { GoalHorizon, GoalKind } from '@prisma/client';
import { useId, useState } from 'react';
import { GoalDialogBody } from '@/components/goals/dialogs/goal-dialog-body';
import { GoalDialogHeader } from '@/components/goals/dialogs/goal-dialog-header';
import { useGoalDialogActions } from '@/components/goals/dialogs/use-goal-dialog-actions';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { parseGoalMetricConfig } from '@/lib/goals/goal-metric-config';

type GoalFormVariant = 'race' | 'performance' | 'period' | 'legacy';

function initialVariant(goal: GoalForEdit | null | undefined): GoalFormVariant {
  if (!goal) {
    return 'race';
  }
  if (goal.kind === GoalKind.RACE) {
    return 'race';
  }
  const config = parseGoalMetricConfig(goal.metricKey);
  if (config?.template === 'performance') {
    return 'performance';
  }
  if (config?.template === 'period') {
    return 'period';
  }
  return 'legacy';
}

export interface GoalForEdit {
  id: string;
  title: string;
  kind: GoalKind;
  horizon: GoalHorizon | null;
  metricKey?: string | null;
  startValue: number | null;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
  lowerIsBetter: boolean;
  targetDate: string | Date | null;
  location: string | null;
  notes: string | null;
  priority: import('@prisma/client').GoalPriority | null;
  raceFormat: string | null;
  targetPerformance: string | null;
  validatingActivityId?: string | null;
  lastAchievedAt?: string | Date | null;
}

interface GoalDialogProps {
  goal?: GoalForEdit | null;
  onClose: () => void;
}

export function GoalDialog({ goal, onClose }: GoalDialogProps) {
  const isEdit = Boolean(goal);
  const metricFormId = useId();
  const [variant] = useState<GoalFormVariant>(initialVariant(goal));
  const [priority, setPriority] = useState<string>(goal?.priority ?? 'A');
  const [error, setError] = useState<string | null>(null);
  const [legacyHorizon, setLegacyHorizon] = useState<GoalHorizon>(
    goal?.horizon ?? GoalHorizon.MEDIUM_TERM,
  );
  const [legacyLowerIsBetter, setLegacyLowerIsBetter] = useState(goal?.lowerIsBetter ?? false);

  const actions = useGoalDialogActions({
    goal,
    isEdit,
    priority,
    legacyHorizon,
    legacyLowerIsBetter,
    onClose,
    setError,
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <GoalDialogHeader isEdit={isEdit} />

        <GoalDialogBody
          error={error}
          goal={goal}
          isEdit={isEdit}
          legacyHorizon={legacyHorizon}
          legacyLowerIsBetter={legacyLowerIsBetter}
          metricFormId={metricFormId}
          pending={actions.pending}
          priority={priority}
          variant={variant}
          onClose={onClose}
          onCreateSubmit={actions.submitPayload}
          onError={setError}
          onHorizonChange={setLegacyHorizon}
          onLegacySubmit={(e) => void actions.handleLegacyMetricSubmit(e)}
          onLowerIsBetterChange={setLegacyLowerIsBetter}
          onPriorityChange={setPriority}
          onRaceSubmit={(e) => void actions.handleRaceSubmit(e)}
          onStructuredSubmit={(result) => void actions.handleStructuredMetricSubmit(result)}
        />
      </DialogContent>
    </Dialog>
  );
}
