'use client';

import { GoalHorizon, GoalKind } from '@prisma/client';
import { Calendar, Timer } from 'lucide-react';
import {
  MetricGoalForm,
  type MetricGoalFormResult,
} from '@/components/goals/dialogs/metric-goal-form';
import { Button } from '@/components/ui/button';
import type { GoalForEdit } from '@/components/goals/dialogs/goal-dialog';
import { GoalLegacyMetricFields } from '@/components/goals/dialogs/goal-legacy-metric-fields';
import { GoalRaceEditFields } from '@/components/goals/dialogs/goal-race-edit-fields';
import type { GoalPayload } from '@/hooks/use-data';

const NO_PRIORITY = 'none';

export function toDateInput(value: string | Date | null | undefined): string {
  if (!value) {
    return '';
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toISOString().slice(0, 10);
}

export function GoalDialogFormActions({
  pending,
  submitType,
  onClose,
}: {
  pending: boolean;
  submitType: 'submit' | { form: string };
  onClose: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onClose}>
        Annuler
      </Button>
      <Button
        disabled={pending}
        form={typeof submitType === 'object' ? submitType.form : undefined}
        type="submit"
      >
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </div>
  );
}

export function GoalRaceEditForm({
  goal,
  priority,
  error,
  pending,
  onPriorityChange,
  onSubmit,
  onClose,
}: {
  goal?: GoalForEdit | null;
  priority: string;
  error: string | null;
  pending: boolean;
  onPriorityChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <GoalRaceEditFields goal={goal} priority={priority} onPriorityChange={onPriorityChange} />
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <GoalDialogFormActions pending={pending} submitType="submit" onClose={onClose} />
    </form>
  );
}

export function GoalStructuredMetricEditForm({
  variant,
  goal,
  metricFormId,
  error,
  pending,
  onError,
  onSubmit,
  onClose,
}: {
  variant: 'performance' | 'period';
  goal?: GoalForEdit | null;
  metricFormId: string;
  error: string | null;
  pending: boolean;
  onError: (message: string | null) => void;
  onSubmit: (result: MetricGoalFormResult) => void;
  onClose: () => void;
}) {
  return (
    <>
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        {variant === 'performance' ? (
          <Timer className="size-4 shrink-0" aria-hidden />
        ) : (
          <Calendar className="size-4 shrink-0" aria-hidden />
        )}
        {variant === 'performance' ? 'Temps sur distance' : 'Objectif récurrent'}
      </p>
      <MetricGoalForm
        formId={metricFormId}
        goal={goal}
        template={variant}
        onError={onError}
        onSubmit={onSubmit}
      />
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <GoalDialogFormActions
        pending={pending}
        submitType={{ form: metricFormId }}
        onClose={onClose}
      />
    </>
  );
}

export function GoalLegacyMetricEditForm({
  goal,
  legacyHorizon,
  legacyLowerIsBetter,
  error,
  pending,
  onHorizonChange,
  onLowerIsBetterChange,
  onSubmit,
  onClose,
}: {
  goal?: GoalForEdit | null;
  legacyHorizon: GoalHorizon;
  legacyLowerIsBetter: boolean;
  error: string | null;
  pending: boolean;
  onHorizonChange: (horizon: GoalHorizon) => void;
  onLowerIsBetterChange: (value: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <GoalLegacyMetricFields
        goal={goal}
        legacyHorizon={legacyHorizon}
        legacyLowerIsBetter={legacyLowerIsBetter}
        onHorizonChange={onHorizonChange}
        onLowerIsBetterChange={onLowerIsBetterChange}
      />
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <GoalDialogFormActions pending={pending} submitType="submit" onClose={onClose} />
    </form>
  );
}

export function parseGoalFormData(fd: FormData) {
  const str = (k: string) => {
    const v = fd.get(k);
    const s = typeof v === 'string' ? v.trim() : '';
    return s === '' ? null : s;
  };
  return { str, title: (fd.get('title') as string)?.trim() ?? '' };
}

export function buildRacePayload(fd: FormData, priority: string): GoalPayload {
  const { str, title } = parseGoalFormData(fd);
  return {
    title,
    kind: GoalKind.RACE,
    notes: str('notes'),
    location: str('location'),
    targetDate: str('targetDate'),
    priority: priority === NO_PRIORITY ? null : (priority as GoalPayload['priority']),
    raceFormat: str('raceFormat'),
    targetPerformance: str('targetPerformance'),
  };
}

export function buildLegacyMetricPayload(
  fd: FormData,
  legacyHorizon: GoalHorizon,
  legacyLowerIsBetter: boolean,
): GoalPayload {
  const { str, title } = parseGoalFormData(fd);
  return {
    title,
    kind: GoalKind.METRIC,
    notes: str('notes'),
    horizon: legacyHorizon,
    metricKey: str('metricKey'),
    unit: str('unit'),
    startValue: str('startValue') ? Number(str('startValue')) : null,
    currentValue: str('currentValue') ? Number(str('currentValue')) : null,
    targetValue: str('targetValue') ? Number(str('targetValue')) : null,
    lowerIsBetter: legacyLowerIsBetter,
    targetDate: str('targetDate'),
  };
}
