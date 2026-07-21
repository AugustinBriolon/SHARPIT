'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import type { ScenarioComparisonViewModel } from '@/core/presentation/scenario-comparison-view-model';
import { fetchScenarioComparisonPresentation } from '@/lib/query/presentation-fetchers';

export function useScenarioComparisonViewModel(
  horizonDays: ProjectionHorizonDays = 7,
  anchorTrainingDayId?: string,
) {
  return useQuery<ScenarioComparisonViewModel>({
    queryKey: ['presentation', 'scenario-comparison', horizonDays, anchorTrainingDayId ?? 'now'],
    queryFn: () => fetchScenarioComparisonPresentation(horizonDays, anchorTrainingDayId),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}
