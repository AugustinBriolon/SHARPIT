'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fetchBodyCompositionEntries, fetchHealthEntries } from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';

// 90 days cover dashboard trends (7–30d) and Recovery curves (60d).
// Fetching 365d was oversized (network + parsing).
const DEFAULT_HEALTH_DAYS = 90;

export function useHealthEntries(days = DEFAULT_HEALTH_DAYS, refDate?: Date) {
  const dateKey = refDate ? format(refDate, 'yyyy-MM-dd') : undefined;
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: queryKeys.health(days, dateKey),
    queryFn: () => fetchHealthEntries(days, dateKey),
    staleTime: 2 * 60 * 1000,
  });
}

export function useBodyComposition(days?: number) {
  return useQuery({
    queryKey: queryKeys.bodyComposition(days),
    queryFn: () => fetchBodyCompositionEntries(days),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });
}
