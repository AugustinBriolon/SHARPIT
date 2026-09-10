'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import type { ProjectedAthleteCardViewModel } from '@/core/presentation/projected-athlete-view-model';
import { fetchProjectedAthletePresentation } from '@/lib/query/presentation-fetchers';
import { queryKeys } from '@/lib/query/keys';

export function useProjectedAthleteViewModel(
  horizonDays: ProjectionHorizonDays,
  anchorTrainingDayId?: string,
) {
  return useQuery<ProjectedAthleteCardViewModel>({
    queryKey: queryKeys.presentationProjectedAthlete(horizonDays, anchorTrainingDayId),
    queryFn: () => fetchProjectedAthletePresentation(horizonDays, anchorTrainingDayId),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}
