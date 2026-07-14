'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CoachMemoryEntry } from '@/lib/coach-memory/types';
import { queryKeys } from '@/lib/query/keys';

export type CoachMemoryResponse = {
  entries: CoachMemoryEntry[];
  activeId: string | null;
  profileContext: string;
};

export type TravelMemoryPayload = {
  type: 'TRAVEL';
  label?: string | null;
  locationLabel: string;
  locationLat?: number | null;
  locationLng?: number | null;
  startDate: string;
  endDate: string;
  note?: string | null;
  applyToPlannedSessions?: boolean;
};

async function fetchCoachMemory(): Promise<CoachMemoryResponse> {
  const res = await fetch('/api/coach-memory');
  if (!res.ok) throw new Error('coach memory fetch failed');
  return res.json();
}

export function useCoachMemory() {
  return useQuery({
    queryKey: queryKeys.coachMemory,
    queryFn: fetchCoachMemory,
    staleTime: 30_000,
  });
}

export function useCoachMemoryMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.coachMemory });
    void queryClient.invalidateQueries({ queryKey: queryKeys.travelContext });
    void queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });
  };

  const create = useMutation({
    mutationFn: async (payload: TravelMemoryPayload) => {
      const res = await fetch('/api/coach-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Création impossible');
      }
      return res.json();
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: TravelMemoryPayload }) => {
      const res = await fetch(`/api/coach-memory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Modification impossible');
      }
      return res.json();
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/coach-memory/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Suppression impossible');
      }
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
