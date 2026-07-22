'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { fetchPlannedSessions, hydratePlannedSession } from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';
import {
  fetchPlannedSessionPresentation,
  fetchSessionRationalePresentation,
  fetchWeeklyCoachingBriefPresentation,
} from '@/lib/query/presentation-fetchers';
import { listOptimistic, tempId } from '@/lib/query/optimistic';
import {
  applyPlannedSessionBatchOps,
  optimisticPlannedSession,
  plannedSessionBatchSuccessMessage,
  type PlannedSessionBatchOp,
} from '@/lib/query/planned-session-batch';
import { sendJson } from '@/lib/query/send-json';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import {
  applyActivityPlannedSessionLinkOptimistic,
  applyPlannedSessionLinkOptimistic,
  resolvePreviousLinkedActivityId,
} from '@/lib/query/planned-session-link-optimistic';
import type { BrickAnalysis } from '@/lib/validators/coach';
import type { ActivityType, SessionIntensity } from '@prisma/client';

export type { PlannedSessionBatchOp };

export function usePlannedSessions() {
  return useQuery({
    queryKey: queryKeys.plannedSessions,
    queryFn: fetchPlannedSessions,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlannedSessionPresentation(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.plannedSessionPresentation(sessionId ?? ''),
    queryFn: () => fetchPlannedSessionPresentation(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSessionRationalePresentation(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.sessionRationale(sessionId ?? ''),
    queryFn: () => fetchSessionRationalePresentation(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useWeeklyCoachingBriefViewModel(weekStart: string) {
  return useQuery({
    queryKey: queryKeys.weeklyCoachingBrief(weekStart),
    queryFn: () => fetchWeeklyCoachingBriefPresentation(weekStart),
    staleTime: 5 * 60 * 1000,
  });
}

export interface PlannedSessionPayload {
  type: ActivityType;
  date: Date;
  startTime?: string | null;
  title?: string | null;
  description?: string | null;
  durationMin?: number | null;
  load?: number | null;
  intensity?: SessionIntensity | null;
  goalId?: string | null;
  completed?: boolean;
  exposureSetting?: 'INDOOR' | 'OUTDOOR' | 'UNKNOWN' | null;
  locationLabel?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationType?: 'TRACK' | 'ROAD' | 'TRAIL' | 'POOL' | 'GYM' | 'TRAINER' | 'UNKNOWN' | null;
  /** Origin CoachingDecision id — ACCEPTED action recorded server-side when present. */
  decisionId?: string | null;
}

export interface BrickLegPayload {
  type: ActivityType;
  title?: string | null;
  description?: string | null;
  durationMin?: number | null;
  load?: number | null;
  intensity?: SessionIntensity | null;
}

export interface CreateBrickPayload {
  date: Date;
  startTime?: string | null;
  legs: BrickLegPayload[];
}

export function usePlannedSessionMutations() {
  const queryClient = useQueryClient();
  const key = queryKeys.plannedSessions;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: (payload: PlannedSessionPayload) =>
      sendJson('/api/planned-sessions', 'POST', payload),
    ...listOptimistic<ClientPlannedSession, PlannedSessionPayload>({
      queryClient,
      queryKey: key,
      apply: (prev, payload) => [...prev, optimisticPlannedSession(payload)],
      success: 'Séance ajoutée',
      error: "Impossible d'ajouter la séance.",
    }),
  });

  /** Batch create — one optimistic patch + one toast (coach « Remplir ma semaine »). */
  const createMany = useMutation({
    mutationFn: async (payloads: PlannedSessionPayload[]) => {
      if (payloads.length === 0) return [] as ClientPlannedSession[];
      return Promise.all(
        payloads.map((payload) => sendJson('/api/planned-sessions', 'POST', payload)),
      ) as Promise<ClientPlannedSession[]>;
    },
    ...listOptimistic<ClientPlannedSession, PlannedSessionPayload[], ClientPlannedSession[]>({
      queryClient,
      queryKey: key,
      apply: (prev, payloads) => [...prev, ...payloads.map((p) => optimisticPlannedSession(p))],
      success: (payloads) =>
        payloads.length <= 1 ? 'Séance ajoutée' : `${payloads.length} séances ajoutées au planning`,
      error: "Impossible d'ajouter les séances.",
    }),
  });

  /**
   * Batch adapt apply — one optimistic patch + one toast (coach « Ajuster mon planning »).
   * Prefer this over looping create/update/remove so the UI updates Instantly.
   */
  const applyBatch = useMutation({
    mutationFn: async (ops: PlannedSessionBatchOp[]) => {
      await Promise.all(
        ops.map((op) => {
          if (op.op === 'create') {
            return sendJson('/api/planned-sessions', 'POST', op.payload);
          }
          if (op.op === 'update') {
            return sendJson(`/api/planned-sessions/${op.id}`, 'PATCH', op.data);
          }
          return sendJson(`/api/planned-sessions/${op.id}`, 'DELETE');
        }),
      );
    },
    ...listOptimistic<ClientPlannedSession, PlannedSessionBatchOp[]>({
      queryClient,
      queryKey: key,
      apply: applyPlannedSessionBatchOps,
      success: plannedSessionBatchSuccessMessage,
      error: "Impossible d'appliquer les ajustements.",
    }),
    onSettled: (_data, _error, ops) => {
      void invalidate();
      for (const op of ops ?? []) {
        if (op.op === 'update') {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.plannedSessionPresentation(op.id),
          });
        }
      }
    },
  });

  const createBrick = useMutation({
    mutationFn: (payload: CreateBrickPayload) =>
      sendJson('/api/planned-sessions/brick', 'POST', payload),
    ...listOptimistic<ClientPlannedSession, CreateBrickPayload>({
      queryClient,
      queryKey: key,
      apply: (prev, payload) => {
        const groupId = tempId();
        const legs = payload.legs.map((leg, order) =>
          optimisticPlannedSession(
            {
              type: leg.type,
              date: payload.date,
              startTime: payload.startTime ?? null,
              title: leg.title,
              description: leg.description,
              durationMin: leg.durationMin,
              load: leg.load,
              intensity: leg.intensity,
            },
            { groupId, order },
          ),
        );
        return [...prev, ...legs];
      },
      success: 'Brick créé',
      error: 'Impossible de créer le brick.',
    }),
  });

  const updateListOpts = listOptimistic<
    ClientPlannedSession,
    { id: string; data: Partial<PlannedSessionPayload> }
  >({
    queryClient,
    queryKey: key,
    apply: (prev, { id, data }) =>
      prev.map((s) =>
        s.id === id ? ({ ...s, ...data, updatedAt: new Date() } as ClientPlannedSession) : s,
      ),
    error: 'Impossible de mettre à jour la séance.',
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PlannedSessionPayload> }) =>
      sendJson(`/api/planned-sessions/${id}`, 'PATCH', data),
    ...updateListOpts,
    onSettled: (_data, _error, variables) => {
      updateListOpts.onSettled?.();
      void queryClient.invalidateQueries({
        queryKey: queryKeys.plannedSessionPresentation(variables.id),
      });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => sendJson(`/api/planned-sessions/${id}`, 'DELETE'),
    ...listOptimistic<ClientPlannedSession, string>({
      queryClient,
      queryKey: key,
      apply: (prev, id) => prev.filter((s) => s.id !== id),
      success: 'Séance supprimée',
      error: 'Impossible de supprimer la séance.',
    }),
  });

  const analyze = useMutation({
    mutationFn: (id: string) => sendJson(`/api/planned-sessions/${id}/analyze`, 'POST'),
    onSuccess: invalidate,
    onError: (err: unknown) =>
      toast.error("L'analyse a échoué.", {
        description: err instanceof Error ? err.message : undefined,
      }),
  });

  const link = useMutation({
    mutationFn: ({ id, activityId }: { id: string; activityId: string | null }) =>
      sendJson(`/api/planned-sessions/${id}/link`, 'POST', {
        activityId,
      }) as Promise<ClientPlannedSession>,
    onMutate: async ({ id, activityId }) => {
      const activitiesKey = queryKeys.activities;
      await Promise.all([
        queryClient.cancelQueries({ queryKey: key }),
        queryClient.cancelQueries({ queryKey: activitiesKey }),
      ]);

      const previousSessions = queryClient.getQueryData<ClientPlannedSession[]>(key);
      const previousActivities = queryClient.getQueryData<ClientActivity[]>(activitiesKey);
      const previousActivityId = resolvePreviousLinkedActivityId(
        previousSessions?.find((session) => session.id === id),
      );

      if (previousSessions) {
        queryClient.setQueryData<ClientPlannedSession[]>(
          key,
          applyPlannedSessionLinkOptimistic(
            previousSessions,
            { id, activityId },
            previousActivities,
          ),
        );
      }

      if (previousActivities) {
        const nextSessions = queryClient.getQueryData<ClientPlannedSession[]>(key);
        queryClient.setQueryData<ClientActivity[]>(
          activitiesKey,
          applyActivityPlannedSessionLinkOptimistic(
            previousActivities,
            nextSessions,
            { id, activityId },
            previousActivityId,
          ),
        );
      }

      return { previousSessions, previousActivities };
    },
    onError: (err: unknown, _vars, context) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(key, context.previousSessions);
      }
      if (context?.previousActivities) {
        queryClient.setQueryData(queryKeys.activities, context.previousActivities);
      }
      toast.error('La liaison a échoué.', {
        description: err instanceof Error ? err.message : undefined,
      });
    },
    onSuccess: (data, variables) => {
      const hydrated = hydratePlannedSession(data);
      queryClient.setQueryData<ClientPlannedSession[]>(key, (prev) =>
        prev ? prev.map((session) => (session.id === variables.id ? hydrated : session)) : prev,
      );
      if (variables.activityId) {
        analyze.mutate(variables.id);
        toast.success('Séance liée');
      } else {
        toast.success('Séance déliée');
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.activities });
    },
    onSettled: (_data, _error, variables) => {
      void invalidate();
      if (variables?.id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.plannedSessionPresentation(variables.id),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.sessionRationale(variables.id),
        });
      }
    },
  });

  return { create, createMany, applyBatch, createBrick, update, remove, link, analyze };
}

export interface ClientBrickAnalysis {
  brickGroupId: string;
  content: BrickAnalysis;
  generatedAt: string;
}

export function useBrickAnalysis(brickGroupId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.brickAnalysis(brickGroupId ?? ''),
    enabled: Boolean(brickGroupId),
    queryFn: async (): Promise<ClientBrickAnalysis | null> => {
      const res = await fetch(
        `/api/planned-sessions/brick/analyze?groupId=${encodeURIComponent(brickGroupId!)}`,
      );
      if (!res.ok) throw new Error("Impossible de charger l'analyse du brick.");
      const data = (await res.json()) as { analysis: ClientBrickAnalysis | null };
      return data.analysis ?? null;
    },
  });
}

export function useAnalyzeBrick() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (brickGroupId: string) => {
      const res = await fetch('/api/planned-sessions/brick/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brickGroupId }),
      });
      const data = (await res.json().catch(() => null)) as {
        analysis?: ClientBrickAnalysis;
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "L'analyse du brick a échoué.");
      }
      return data!.analysis as ClientBrickAnalysis;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.brickAnalysis(data.brickGroupId), data);
    },
  });
}
