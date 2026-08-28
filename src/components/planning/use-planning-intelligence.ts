'use client';

import type { ProjectionHorizonDays } from '@/core/projection/types';
import { useProjectedAthleteViewModel } from '@/hooks/use-projected-athlete-view-model';
import { useScenarioComparisonViewModel } from '@/hooks/use-scenario-comparison-view-model';
import { format } from 'date-fns';

const PROJECTION_HORIZON: ProjectionHorizonDays = 7;

export function usePlanningIntelligence(weekIndex: number, weekStart: Date, isLoading: boolean) {
  const showPlanningIntelligence = weekIndex >= 0;
  const anchorTrainingDayId = weekIndex > 0 ? format(weekStart, 'yyyy-MM-dd') : undefined;
  const projectionQuery = useProjectedAthleteViewModel(PROJECTION_HORIZON, anchorTrainingDayId);
  const scenarioComparisonQuery = useScenarioComparisonViewModel(7, anchorTrainingDayId);
  const hasActionableAlternative = Boolean(
    showPlanningIntelligence && !isLoading && scenarioComparisonQuery.data?.visible,
  );

  return {
    anchorTrainingDayId,
    projectionQuery,
    scenarioComparisonQuery,
    hasActionableAlternative,
    showPlanningIntelligence,
  };
}
