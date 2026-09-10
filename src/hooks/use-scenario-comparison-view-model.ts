'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import type { ScenarioComparisonViewModel } from '@/core/presentation/scenario-comparison-view-model';
import { fetchScenarioComparisonPresentation } from '@/lib/query/presentation-fetchers';
import { queryKeys } from '@/lib/query/keys';

export function useScenarioComparisonViewModel(
  horizonDays: ProjectionHorizonDays = 7,
  anchorTrainingDayId?: string,
) {
  return useQuery<ScenarioComparisonViewModel>({
    queryKey: queryKeys.presentationScenarioComparison(horizonDays, anchorTrainingDayId),
    queryFn: () => fetchScenarioComparisonPresentation(horizonDays, anchorTrainingDayId),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}
