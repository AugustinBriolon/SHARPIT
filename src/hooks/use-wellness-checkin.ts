'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCallback } from 'react';
import { queryKeys } from '@/lib/query/keys';

type WellnessCheckinStatus = {
  completed: boolean;
  loading: boolean;
  isPending: boolean;
  submitting: boolean;
  error: string | null;
  submit: (payload: {
    mood: number;
    energyLevel: number;
    perceivedSoreness: number;
    stressLevel: number;
    notes?: string | null;
  }) => Promise<void>;
  refresh: () => void;
};

type WellnessPayload = {
  mood: number;
  energyLevel: number;
  perceivedSoreness: number;
  stressLevel: number;
  notes?: string | null;
};

async function fetchWellnessStatus(trainingDayId: string): Promise<{ completed: boolean }> {
  const res = await fetch(`/api/wellness-checkin?trainingDayId=${trainingDayId}`);
  if (!res.ok) throw new Error('status');
  return res.json() as Promise<{ completed: boolean }>;
}

export function useWellnessCheckin(date: Date = new Date()): WellnessCheckinStatus {
  const trainingDayId = format(date, 'yyyy-MM-dd');
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.wellnessCheckin(trainingDayId),
    queryFn: () => fetchWellnessStatus(trainingDayId),
    staleTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (payload: WellnessPayload) => {
      const res = await fetch('/api/wellness-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, trainingDayId }),
      });
      if (!res.ok) throw new Error('submit');
    },
    onMutate: async () => {
      const key = queryKeys.wellnessCheckin(trainingDayId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ completed: boolean }>(key);
      queryClient.setQueryData(key, { completed: true });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.wellnessCheckin(trainingDayId), context.previous);
      }
    },
    onSettled: () => {
      // Background reconcile — keep Today ViewModel painted; soft refresh Twin expression.
      void queryClient.invalidateQueries({ queryKey: queryKeys.athleteSnapshot(trainingDayId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.presentationToday(trainingDayId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.today(trainingDayId) });
    },
  });

  const submit = useCallback(
    async (payload: WellnessPayload) => {
      await mutation.mutateAsync(payload);
    },
    [mutation],
  );

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.wellnessCheckin(trainingDayId) });
  }, [queryClient, trainingDayId]);

  const error =
    (query.error instanceof Error ? query.error.message : null) ??
    (mutation.error instanceof Error ? "Impossible d'enregistrer ton ressenti. Réessaie." : null);

  return {
    completed: query.data?.completed ?? false,
    loading: query.isPending && query.data == null,
    isPending: query.isPending && query.data == null,
    submitting: mutation.isPending,
    error,
    submit,
    refresh,
  };
}
