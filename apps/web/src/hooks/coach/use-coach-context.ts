'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import type { CoachMemoryResponse } from '@/hooks/use-coach-memory';

export function useCoachContext() {
  return useQuery({
    queryKey: queryKeys.coachContext,
    queryFn: async (): Promise<string> => {
      const res = await fetch('/api/coach/context');
      if (!res.ok) {
        throw new Error('Impossible de charger le contexte.');
      }
      const data = (await res.json()) as { context: string };
      return data.context ?? '';
    },
  });
}

export function useSaveCoachContext() {
  const queryClient = useQueryClient();
  return useMutation<string, Error, string, { previous: string | undefined }>({
    mutationFn: async (context) => {
      const res = await fetch('/api/coach/context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? 'Enregistrement impossible.');
      }
      return (data as { context: string }).context ?? '';
    },
    onMutate: async (context) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.coachContext });
      const previous = queryClient.getQueryData<string>(queryKeys.coachContext);
      queryClient.setQueryData(queryKeys.coachContext, context);
      queryClient.setQueryData<CoachMemoryResponse>(queryKeys.coachMemory, (current) =>
        current
          ? { ...current, profileContext: context }
          : { entries: [], activeId: null, profileContext: context },
      );
      return { previous };
    },
    onError: (_err, _context, rollback) => {
      if (rollback?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.coachContext, rollback.previous);
        queryClient.setQueryData<CoachMemoryResponse>(queryKeys.coachMemory, (current) =>
          current ? { ...current, profileContext: rollback.previous ?? '' } : current,
        );
      }
    },
    onSuccess: (context) => {
      queryClient.setQueryData(queryKeys.coachContext, context);
      queryClient.setQueryData<CoachMemoryResponse>(queryKeys.coachMemory, (current) =>
        current
          ? { ...current, profileContext: context }
          : { entries: [], activeId: null, profileContext: context },
      );
    },
  });
}
