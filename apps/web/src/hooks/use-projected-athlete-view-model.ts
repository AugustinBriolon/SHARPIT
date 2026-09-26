'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ProjectionHorizonDays } from '@sharpit/core/projection/types';
import type { ProjectedAthleteCardViewModel } from '@sharpit/server/presentation/projected-athlete-view-model';
import { fetchProjectedAthletePresentation } from '@/client/query/presentation-fetchers';
import { queryKeys } from '@/client/query/keys';

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
