'use client';

import { useQuery } from '@tanstack/react-query';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import type { ProjectedAthleteCardViewModel } from '@/core/presentation/projected-athlete-view-model';
import { fetchProjectedAthletePresentation } from '@/lib/query/presentation-fetchers';

export function useProjectedAthleteViewModel(horizonDays: ProjectionHorizonDays) {
  return useQuery<ProjectedAthleteCardViewModel>({
    queryKey: ['presentation', 'projected-athlete', horizonDays],
    queryFn: () => fetchProjectedAthletePresentation(horizonDays),
    staleTime: 5 * 60_000,
  });
}
