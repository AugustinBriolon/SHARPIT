'use client';

import { useQuery } from '@tanstack/react-query';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import type { ProjectedAthleteCardViewModel } from '@/core/presentation/projected-athlete-view-model';
import { fetchProjectedAthletePresentation } from '@/lib/query/presentation-fetchers';

export function useProjectedAthleteViewModel(
  horizonDays: ProjectionHorizonDays,
  anchorTrainingDayId?: string,
) {
  return useQuery<ProjectedAthleteCardViewModel>({
    queryKey: ['presentation', 'projected-athlete', horizonDays, anchorTrainingDayId ?? 'now'],
    queryFn: () => fetchProjectedAthletePresentation(horizonDays, anchorTrainingDayId),
    staleTime: 5 * 60_000,
  });
}
