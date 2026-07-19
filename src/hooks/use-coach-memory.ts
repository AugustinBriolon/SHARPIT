'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CoachMemoryEntry } from '@/lib/coach-memory/types';
import { toast } from '@/components/ui/toast';
import { isTempId, tempId } from '@/lib/query/optimistic';
import { queryKeys } from '@/lib/query/keys';

export type CoachMemoryResponse = {
  entries: CoachMemoryEntry[];
  activeId: string | null;
  profileContext: string;
};

export type TravelMemoryPayload = {
  type: 'TRAVEL' | 'CONSTRAINT';
  label?: string | null;
  /** Required for TRAVEL; omitted for CONSTRAINT (no place). */
  locationLabel?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  startDate: string;
  endDate: string;
  note?: string | null;
  trainingConstraint?: 'FULL' | 'REDUCED' | 'MOBILITY_ONLY' | 'NONE' | null;
  allowedDisciplines?: Array<'RUN' | 'BIKE' | 'SWIM' | 'STRENGTH' | 'MOBILITY'> | null;
  noStructuredTraining?: boolean;
  applyToPlannedSessions?: boolean;
};

type TravelContextResponse = {
  active: {
    id: string;
    label: string | null;
    locationLabel: string;
    startDate: string;
    endDate: string;
    note: string | null;
  } | null;
};

async function fetchCoachMemory(): Promise<CoachMemoryResponse> {
  const res = await fetch('/api/coach-memory');
  if (!res.ok) throw new Error('coach memory fetch failed');
  return res.json();
}

function optimisticTravelEntry(payload: TravelMemoryPayload): CoachMemoryEntry {
  const now = new Date().toISOString();
  return {
    id: tempId(),
    type: payload.type,
    source: 'USER',
    label: payload.label ?? null,
    locationLabel: payload.locationLabel ?? null,
    locationLat: payload.locationLat ?? null,
    locationLng: payload.locationLng ?? null,
    startDate: payload.startDate,
    endDate: payload.endDate,
    note: payload.note ?? null,
    trainingConstraint: payload.trainingConstraint ?? 'FULL',
    allowedDisciplines: payload.allowedDisciplines ?? [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

function patchMemoryEntries(
  current: CoachMemoryResponse | undefined,
  entries: CoachMemoryEntry[],
  activeId?: string | null,
): CoachMemoryResponse {
  return {
    entries,
    activeId: activeId === undefined ? (current?.activeId ?? null) : activeId,
    profileContext: current?.profileContext ?? '',
  };
}

export function useCoachMemory() {
  return useQuery({
    queryKey: queryKeys.coachMemory,
    queryFn: fetchCoachMemory,
    staleTime: 2 * 60_000,
  });
}

export function useCoachMemoryMutations() {
  const queryClient = useQueryClient();
  const key = queryKeys.coachMemory;

  const softRefreshTravelAndSessions = (applyToPlannedSessions?: boolean) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.travelContext });
    if (applyToPlannedSessions) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });
    }
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
      const data = (await res.json()) as { entry: CoachMemoryEntry };
      return data.entry;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CoachMemoryResponse>(key);
      const entry = optimisticTravelEntry(payload);
      if (previous) {
        queryClient.setQueryData(
          key,
          patchMemoryEntries(previous, [entry, ...previous.entries], entry.id),
        );
      }
      // A Contrainte has no place — never becomes "the active travel location".
      if (payload.type === 'TRAVEL' && entry.locationLabel) {
        queryClient.setQueryData<TravelContextResponse>(queryKeys.travelContext, {
          active: {
            id: entry.id,
            label: entry.label,
            locationLabel: entry.locationLabel,
            startDate: entry.startDate,
            endDate: entry.endDate,
            note: entry.note,
          },
        });
      }
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.travelContext });
      toast.error("Impossible d'enregistrer le contexte voyage.");
    },
    onSuccess: (entry, payload) => {
      queryClient.setQueryData<CoachMemoryResponse>(key, (current) => {
        if (!current) return current;
        const withoutTemp = current.entries.filter((e) => !isTempId(e.id) && e.id !== entry.id);
        return patchMemoryEntries(current, [entry, ...withoutTemp], entry.id);
      });
      softRefreshTravelAndSessions(payload.applyToPlannedSessions);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
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
      const data = (await res.json()) as { entry: CoachMemoryEntry };
      return data.entry;
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CoachMemoryResponse>(key);
      if (previous) {
        queryClient.setQueryData(
          key,
          patchMemoryEntries(
            previous,
            previous.entries.map((e) =>
              e.id === id
                ? {
                    ...e,
                    label: payload.label ?? null,
                    locationLabel: payload.locationLabel ?? null,
                    locationLat: payload.locationLat ?? null,
                    locationLng: payload.locationLng ?? null,
                    startDate: payload.startDate,
                    endDate: payload.endDate,
                    note: payload.note ?? null,
                    trainingConstraint: payload.trainingConstraint ?? e.trainingConstraint,
                    allowedDisciplines: payload.allowedDisciplines ?? e.allowedDisciplines,
                    updatedAt: new Date().toISOString(),
                  }
                : e,
            ),
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
      toast.error('Impossible de modifier le contexte voyage.');
    },
    onSuccess: (entry, { payload }) => {
      queryClient.setQueryData<CoachMemoryResponse>(key, (current) => {
        if (!current) return current;
        return patchMemoryEntries(
          current,
          current.entries.map((e) => (e.id === entry.id ? entry : e)),
        );
      });
      softRefreshTravelAndSessions(payload.applyToPlannedSessions);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.travelContext });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/coach-memory/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Suppression impossible');
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CoachMemoryResponse>(key);
      const previousTravel = queryClient.getQueryData<TravelContextResponse>(
        queryKeys.travelContext,
      );
      if (previous) {
        const nextEntries = previous.entries.filter((e) => e.id !== id);
        queryClient.setQueryData(
          key,
          patchMemoryEntries(
            previous,
            nextEntries,
            previous.activeId === id ? (nextEntries[0]?.id ?? null) : previous.activeId,
          ),
        );
      }
      if (previousTravel?.active?.id === id) {
        queryClient.setQueryData<TravelContextResponse>(queryKeys.travelContext, {
          active: null,
        });
      }
      return { previous, previousTravel };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
      if (context?.previousTravel) {
        queryClient.setQueryData(queryKeys.travelContext, context.previousTravel);
      }
      toast.error('Impossible de supprimer le contexte voyage.');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.travelContext });
    },
  });

  return { create, update, remove };
}
