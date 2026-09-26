'use client';

import { useMemo } from 'react';
import { performanceSports } from '@sharpit/server/lib/goals/goal-metric-config';
import {
  performanceSportsForPracticed,
  periodSportOptionsForPracticed,
  type PracticedSportId,
} from '@sharpit/server/lib/practiced-sports';
import { useResolvedPracticedSports } from '@/components/practiced-sports/use-resolved-practiced-sports';

export function useAllowedMetricSports(practicedSports?: readonly PracticedSportId[]) {
  const effectiveSports = useResolvedPracticedSports(practicedSports);
  const allowedPerformanceSports = useMemo(() => {
    const filtered = performanceSportsForPracticed(effectiveSports);
    return filtered.length > 0 ? filtered : performanceSports;
  }, [effectiveSports]);
  const allowedPeriodSports = useMemo(
    () => periodSportOptionsForPracticed(effectiveSports),
    [effectiveSports],
  );

  return { allowedPerformanceSports, allowedPeriodSports };
}
