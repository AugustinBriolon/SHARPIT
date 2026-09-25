import {
  buildPerformanceGoalFields,
  buildPeriodGoalFields,
  parseChronoInput,
  parseTargetInput,
  type GoalEndMode,
  type GoalPeriod,
  type PeriodMeasure,
} from '@/lib/goals/goal-metric-config';
import { ActivityType } from '@prisma/client';
import type { MetricGoalFormResult } from '@/components/goals/dialogs/metric-goal-form';

export async function submitPerformanceMetricGoal({
  notes,
  sport,
  distanceM,
  chronoTarget,
  performanceEndMode,
  performanceEndDate,
  customTitle,
  onError,
  onSubmit,
}: {
  notes: string | null;
  sport: ActivityType;
  distanceM: number | null;
  chronoTarget: string;
  performanceEndMode: GoalEndMode;
  performanceEndDate: string;
  customTitle: string;
  onError: (message: string | null) => void;
  onSubmit: (result: MetricGoalFormResult) => void | Promise<void>;
}) {
  const targetSeconds = parseChronoInput(chronoTarget);
  if (!distanceM) {
    onError('Choisis une distance valide.');
    return;
  }
  if (!targetSeconds || targetSeconds <= 0) {
    onError('Saisis un chrono cible (mm:ss ou h:mm:ss).');
    return;
  }
  if (performanceEndMode === 'on_date' && !performanceEndDate) {
    onError('Choisis une date limite.');
    return;
  }

  const fields = buildPerformanceGoalFields(
    { v: 1, template: 'performance', sport, distanceM, endMode: performanceEndMode },
    targetSeconds,
    performanceEndMode,
  );

  await onSubmit({
    title: customTitle.trim() || fields.title,
    horizon: fields.horizon,
    metricKey: fields.metricKey,
    startValue: fields.startValue,
    currentValue: fields.currentValue,
    targetValue: fields.targetValue,
    unit: fields.unit,
    lowerIsBetter: fields.lowerIsBetter,
    notes,
    targetDate: performanceEndMode === 'on_date' ? performanceEndDate : null,
  });
}

export async function submitPeriodMetricGoal({
  notes,
  period,
  measure,
  periodSport,
  periodTarget,
  periodEndDate,
  customTitle,
  onError,
  onSubmit,
}: {
  notes: string | null;
  period: GoalPeriod;
  measure: PeriodMeasure;
  periodSport: string;
  periodTarget: string;
  periodEndDate: string;
  customTitle: string;
  onError: (message: string | null) => void;
  onSubmit: (result: MetricGoalFormResult) => void | Promise<void>;
}) {
  const target = parseTargetInput(measure, periodTarget);
  if (target === null) {
    onError('Saisis une cible valide.');
    return;
  }

  const ALL_SPORTS = 'ALL';
  const fields = buildPeriodGoalFields(
    {
      v: 1,
      template: 'period',
      period,
      measure,
      sport: periodSport === ALL_SPORTS ? null : (periodSport as ActivityType),
    },
    target,
    customTitle,
  );

  await onSubmit({
    title: fields.title,
    horizon: fields.horizon,
    metricKey: fields.metricKey,
    startValue: fields.startValue,
    currentValue: fields.currentValue,
    targetValue: fields.targetValue,
    unit: fields.unit,
    lowerIsBetter: fields.lowerIsBetter,
    notes,
    targetDate: periodEndDate || null,
  });
}
