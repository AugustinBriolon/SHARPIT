'use client';

import type { GoalItem } from '@/components/goals/cards/goal-cards';
import {
  deadlineCopy,
  formatLongDate,
  metricGoalSubtitle,
} from '@/components/goals/cards/goal-card-format';
import { CardContent, CardTitle } from '@/components/ui/card';
import { computeGoalProgress, daysUntil, formatRemaining } from '@/lib/goals/goals';
import {
  describeMetricGoal,
  formatGoalDisplayValue,
  parseGoalMetricConfig,
} from '@/lib/goals/goal-metric-config';
import { AchievedStatus, GoalProgressTrack } from '@/components/goals/cards/goal-cards-parts';

function formatValue(value: number | null, unit: string | null, metricKey?: string | null): string {
  return formatGoalDisplayValue(value, unit, parseGoalMetricConfig(metricKey));
}

function MetricGoalValuesRow({
  currentLabel,
  currentValue,
  targetValue,
  unit,
  metricKey,
}: {
  currentLabel: string;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
  metricKey?: string | null;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        {currentLabel}{' '}
        <span className="text-foreground font-mono tabular-nums">
          {formatValue(currentValue, unit, metricKey)}
        </span>
      </span>
      <span className="text-muted-foreground">
        Cible{' '}
        <span className="text-primary font-mono tabular-nums">
          {formatValue(targetValue, unit, metricKey)}
        </span>
      </span>
    </div>
  );
}

function MetricGoalFootnotes({
  goal,
  isAutoTracked,
  metricConfig,
  days,
}: {
  goal: GoalItem;
  isAutoTracked: boolean;
  metricConfig: ReturnType<typeof parseGoalMetricConfig>;
  days: number | null;
}) {
  return (
    <>
      {isAutoTracked ? (
        <p className="text-muted-foreground text-xs">
          Progression calculée depuis tes activités synchronisées.
        </p>
      ) : null}
      {days !== null && !isAutoTracked && goal.targetDate ? (
        <p className="text-muted-foreground text-xs">{deadlineCopy(days)}</p>
      ) : null}
      {isAutoTracked && goal.targetDate ? (
        <p className="text-muted-foreground text-xs">
          Jusqu&apos;au {formatLongDate(goal.targetDate)}
        </p>
      ) : null}
      {goal.notes ? (
        <p className="text-muted-foreground line-clamp-3 text-xs whitespace-pre-wrap">
          {goal.notes}
        </p>
      ) : null}
    </>
  );
}

function MetricGoalAchievedBlock({
  goal,
  isAutoTracked,
  metricConfig,
}: {
  goal: GoalItem;
  isAutoTracked: boolean;
  metricConfig: ReturnType<typeof parseGoalMetricConfig>;
}) {
  return (
    <AchievedStatus
      lastAchievedAt={goal.lastAchievedAt}
      showValidatingLink={isAutoTracked && metricConfig?.template === 'performance'}
      validatingActivityId={goal.validatingActivityId}
    />
  );
}

export function MetricGoalCardBody({ goal }: { goal: GoalItem }) {
  const metricConfig = parseGoalMetricConfig(goal.metricKey);
  const subtitle = describeMetricGoal(metricConfig, goal.targetDate);
  const progress = computeGoalProgress(goal);
  const remaining = formatRemaining(goal);
  const days = daysUntil(goal.targetDate ? new Date(goal.targetDate) : null);
  const isAutoTracked = Boolean(metricConfig);
  const currentLabel = metricConfig?.template === 'performance' ? 'Meilleur' : 'Actuel';

  return (
    <CardContent className="space-y-3">
      <div className="min-w-0">
        <CardTitle>{goal.title}</CardTitle>
        {metricGoalSubtitle(goal, subtitle)}
      </div>

      {goal.achieved ? (
        <MetricGoalAchievedBlock
          goal={goal}
          isAutoTracked={isAutoTracked}
          metricConfig={metricConfig}
        />
      ) : null}

      {progress !== null && !goal.achieved ? (
        <GoalProgressTrack progress={progress} remaining={remaining} />
      ) : null}

      <MetricGoalValuesRow
        currentLabel={currentLabel}
        currentValue={goal.currentValue}
        metricKey={goal.metricKey}
        targetValue={goal.targetValue}
        unit={goal.unit}
      />

      <MetricGoalFootnotes
        days={days}
        goal={goal}
        isAutoTracked={isAutoTracked}
        metricConfig={metricConfig}
      />
    </CardContent>
  );
}
