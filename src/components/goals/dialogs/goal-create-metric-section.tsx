'use client';

import { Calendar, Timer } from 'lucide-react';
import {
  MetricGoalForm,
  type MetricGoalFormResult,
} from '@/components/goals/dialogs/metric-goal-form';
import type { PracticedSportId } from '@/lib/practiced-sports';

export function GoalCreateMetricSection({
  variant,
  metricFormId,
  practicedSports,
  onError,
  onSubmit,
}: {
  variant: 'performance' | 'period';
  metricFormId: string;
  practicedSports?: readonly PracticedSportId[];
  onError: (message: string | null) => void;
  onSubmit: (result: MetricGoalFormResult) => void;
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
        practicedSports={practicedSports}
        template={variant}
        onError={onError}
        onSubmit={onSubmit}
      />
    </>
  );
}
