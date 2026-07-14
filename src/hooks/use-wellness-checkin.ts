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
    mutationFn: async (payload: {
      mood: number;
      energyLevel: number;
      perceivedSoreness: number;
      stressLevel: number;
      notes?: string | null;
    }) => {
      const res = await fetch('/api/wellness-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, trainingDayId }),
      });
      if (!res.ok) throw new Error('submit');
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.wellnessCheckin(trainingDayId), { completed: true });
      void queryClient.invalidateQueries({ queryKey: queryKeys.today(trainingDayId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.athleteSnapshot(trainingDayId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.presentationToday(trainingDayId),
      });
    },
  });

  const submit = useCallback(
    async (payload: {
      mood: number;
      energyLevel: number;
      perceivedSoreness: number;
      stressLevel: number;
      notes?: string | null;
    }) => {
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
    loading: query.isPending,
    isPending: query.isPending,
    submitting: mutation.isPending,
    error,
    submit,
    refresh,
  };
}
