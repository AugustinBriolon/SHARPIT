'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCallback } from 'react';
import type { MorningWellnessEntry } from '@/lib/journal/morning-wellness-entry';
import { queryKeys } from '@/lib/query/keys';

type WellnessCheckinQuery = {
  completed: boolean;
  entry: MorningWellnessEntry | null;
};

type WellnessCheckinStatus = {
  completed: boolean;
  entry: MorningWellnessEntry | null;
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
  }) => void;
  refresh: () => void;
};

type WellnessPayload = {
  mood: number;
  energyLevel: number;
  perceivedSoreness: number;
  stressLevel: number;
  notes?: string | null;
};

async function fetchWellnessStatus(trainingDayId: string): Promise<WellnessCheckinQuery> {
  const res = await fetch(`/api/wellness-checkin?trainingDayId=${trainingDayId}`);
  if (!res.ok) {
    throw new Error('status');
  }
  const data = (await res.json()) as {
    completed?: boolean;
    entry?: MorningWellnessEntry | null;
  };
  return {
    completed: Boolean(data.completed),
    entry: data.entry ?? null,
  };
}

function resolveWellnessError(queryError: unknown, mutationError: unknown): string | null {
  if (queryError instanceof Error) {
    return queryError.message;
  }
  if (mutationError instanceof Error) {
    return "Impossible d'enregistrer ton ressenti. Réessaie.";
  }
  return null;
}

function toCachedEntry(payload: WellnessPayload): MorningWellnessEntry {
  return {
    mood: payload.mood,
    energyLevel: payload.energyLevel,
    perceivedSoreness: payload.perceivedSoreness,
    stressLevel: payload.stressLevel,
    notes: payload.notes?.trim() ? payload.notes.trim() : null,
  };
}

export function useWellnessCheckin(date: Date = new Date()): WellnessCheckinStatus {
  const trainingDayId = format(date, 'yyyy-MM-dd');
  const queryClient = useQueryClient();

  const query = useQuery<WellnessCheckinQuery>({
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
      if (!res.ok) {
        throw new Error('submit');
      }
    },
    onMutate: async (payload) => {
      const key = queryKeys.wellnessCheckin(trainingDayId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<WellnessCheckinQuery>(key);
      queryClient.setQueryData<WellnessCheckinQuery>(key, {
        completed: true,
        entry: toCachedEntry(payload),
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.wellnessCheckin(trainingDayId), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.athleteSnapshot(trainingDayId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.presentationToday(trainingDayId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.today(trainingDayId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wellnessCheckin(trainingDayId) });
    },
  });

  const submit = useCallback(
    (payload: WellnessPayload) => {
      mutation.mutate(payload);
    },
    [mutation],
  );

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.wellnessCheckin(trainingDayId) });
  }, [queryClient, trainingDayId]);

  const isInitialLoad = query.isPending && query.data === undefined;

  return {
    completed: query.data?.completed ?? false,
    entry: query.data?.entry ?? null,
    loading: isInitialLoad,
    isPending: isInitialLoad,
    submitting: mutation.isPending,
    error: resolveWellnessError(query.error, mutation.error),
    submit,
    refresh,
  };
}
