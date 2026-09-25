'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchLatestWeeklyReview,
  fetchWeeklyReview,
  type ClientWeeklyReview,
} from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';

export function useWeeklyReview(date: string) {
  return useQuery({
    queryKey: queryKeys.weeklyReview(date),
    queryFn: () => fetchWeeklyReview(date),
  });
}

/** Rétro la plus récente, quelle que soit la semaine — voir fetchLatestWeeklyReview. */
export function useLatestWeeklyReview() {
  return useQuery({
    queryKey: queryKeys.weeklyReview('latest'),
    queryFn: fetchLatestWeeklyReview,
  });
}

export function useGenerateWeeklyReview() {
  const queryClient = useQueryClient();
  return useMutation<ClientWeeklyReview, Error, string>({
    mutationFn: async (date) => {
      const res = await fetch('/api/coach/weekly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? 'Génération de la rétro impossible.');
      }
      const r = data.review;
      return {
        id: r.id,
        weekStart: new Date(r.weekStart),
        content: r.content,
        stats: r.stats ?? null,
        generatedAt: new Date(r.generatedAt),
      } as ClientWeeklyReview;
    },
    onSuccess: (review, date) => {
      queryClient.setQueryData(queryKeys.weeklyReview(date), review);
      // The generated review is always the newest one (POST always uses `current: true`).
      queryClient.setQueryData(queryKeys.weeklyReview('latest'), review);
    },
  });
}
