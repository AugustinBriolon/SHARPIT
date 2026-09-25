'use client';

import { useCallback } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import type { DataDaysDomain } from '@/lib/presentation/data-days/data-days';
import {
  buildDataDaysLookup,
  type DataDaysLookup,
  type DayRange,
} from '@/lib/presentation/data-days/data-days-chunks';
import { fetchDataDays } from '@/lib/query/presentation-fetchers';
import { queryKeys } from '@/lib/query/keys';

/** Which days carry data for `domain`, across every requested range. Unknown until loaded. */
export function useDataDays(domain: DataDaysDomain, ranges: readonly DayRange[]): DataDaysLookup {
  const combine = useCallback(
    (results: UseQueryResult<string[]>[]) =>
      buildDataDaysLookup(
        ranges,
        results.map((result) => result.data),
      ),
    [ranges],
  );

  return useQueries({
    queries: ranges.map((range) => ({
      queryKey: queryKeys.presentationDataDays(domain, range.from, range.to),
      queryFn: () => fetchDataDays(domain, range.from, range.to),
      staleTime: 5 * 60_000,
    })),
    combine,
  });
}
