'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchActivities, fetchActivityStream, fetchMultisportStreams } from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';
import { listOptimistic, tempId, isTempId } from '@/lib/query/optimistic';
import { sendJson } from '@/lib/query/send-json';
import type { ClientActivity } from '@/lib/query/types';
import type { createActivitySchema } from '@/lib/validators/activity';
import { nullishFields } from '@/lib/query/nullish-fields';
import type { z } from 'zod';

export function useActivities() {
  return useQuery({
    queryKey: queryKeys.activities,
    queryFn: fetchActivities,
    // Shared history across 8 views — avoid full refetch on every mount / focus.
    // Mutations invalidate explicitly.
    staleTime: 2 * 60 * 1000,
  });
}

export type ActivityMutationPayload = z.input<typeof createActivitySchema>;

const ACTIVITY_SCALAR_KEYS = [
  'title',
  'duration',
  'load',
  'rpe',
  'feeling',
  'weather',
  'notes',
] as const satisfies readonly (keyof ActivityMutationPayload)[];

function activityDate(payload: ActivityMutationPayload): Date {
  return payload.date instanceof Date ? payload.date : new Date(payload.date as string);
}

function optimisticRunMetrics(payload: ActivityMutationPayload) {
  const distanceM = payload.runMetrics?.distanceM;
  return distanceM !== null && distanceM !== undefined ? { distanceM } : null;
}

function optimisticBikeMetrics(payload: ActivityMutationPayload) {
  const bike = payload.bikeMetrics;
  if (!bike || (bike.tss === null && bike.avgPower === null)) {
    return null;
  }
  return { tss: bike.tss ?? null, avgPower: bike.avgPower ?? null };
}

function optimisticSwimMetrics(payload: ActivityMutationPayload) {
  const distanceM = payload.swimMetrics?.distanceM;
  return distanceM !== null && distanceM !== undefined ? { distanceM } : null;
}

function optimisticActivity(payload: ActivityMutationPayload): ClientActivity {
  const now = new Date();
  return {
    id: tempId(),
    type: payload.type,
    date: activityDate(payload),
    ...nullishFields(payload, ACTIVITY_SCALAR_KEYS),
    source: 'manual',
    stravaId: null,
    garminId: null,
    createdAt: now,
    updatedAt: now,
    runMetrics: optimisticRunMetrics(payload),
    bikeMetrics: optimisticBikeMetrics(payload),
    swimMetrics: optimisticSwimMetrics(payload),
    strengthSets: (payload.strengthSets ?? []).map((s) => ({ exercise: s.exercise })),
    plannedSession: null,
  } as unknown as ClientActivity;
}

export function useActivityMutations() {
  const queryClient = useQueryClient();
  const key = queryKeys.activities;

  const create = useMutation({
    mutationFn: (payload: ActivityMutationPayload) =>
      sendJson('/api/activities', 'POST', payload) as Promise<{ id: string }>,
    ...listOptimistic<ClientActivity, ActivityMutationPayload, { id: string }>({
      queryClient,
      queryKey: key,
      apply: (prev, payload) => [optimisticActivity(payload), ...prev],
      reconcile: (prev, data) => {
        const withoutTemp = prev.filter((a) => !isTempId(a.id));
        if (withoutTemp.some((a) => a.id === data.id)) {
          return withoutTemp;
        }
        const optimistic = prev.find((a) => isTempId(a.id));
        if (!optimistic) {
          return withoutTemp;
        }
        return [
          { ...optimistic, id: data.id },
          ...withoutTemp.filter((a) => a.id !== optimistic.id),
        ];
      },
      success: 'Séance enregistrée',
      error: "Impossible d'enregistrer la séance.",
    }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.records });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ActivityMutationPayload> }) =>
      sendJson(`/api/activities/${id}`, 'PATCH', data) as Promise<{ id: string }>,
    ...listOptimistic<
      ClientActivity,
      { id: string; data: Partial<ActivityMutationPayload> },
      { id: string }
    >({
      queryClient,
      queryKey: key,
      apply: (prev, { id, data }) =>
        prev.map((a) => {
          if (a.id !== id) {
            return a;
          }
          let nextDate = a.date;
          if (data.date) {
            nextDate = data.date instanceof Date ? data.date : new Date(data.date as string);
          }
          return {
            ...a,
            ...data,
            date: nextDate,
            updatedAt: new Date(),
          } as ClientActivity;
        }),
      error: 'Impossible de mettre à jour la séance.',
    }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.records });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => sendJson(`/api/activities/${id}`, 'DELETE'),
    ...listOptimistic<ClientActivity, string>({
      queryClient,
      queryKey: key,
      apply: (prev, id) => prev.filter((a) => a.id !== id),
      success: 'Séance supprimée',
      error: 'Impossible de supprimer la séance.',
      invalidateOnSettle: true,
    }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      // Deleting a linked activity resets the planned session (completed → false).
      void queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.records });
    },
  });

  return { create, update, remove };
}

export function useActivityStream(id: string) {
  return useQuery({
    queryKey: queryKeys.activityStream(id),
    queryFn: () => fetchActivityStream(id),
    staleTime: Infinity, // frozen historical activity data
    retry: 1,
  });
}

export function useMultisportStreams(id: string) {
  return useQuery({
    queryKey: queryKeys.multisportStreams(id),
    queryFn: () => fetchMultisportStreams(id),
    staleTime: Infinity,
    retry: 1,
  });
}
