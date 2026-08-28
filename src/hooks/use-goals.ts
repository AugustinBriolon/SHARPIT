'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchGoalAchievements, fetchGoals } from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';
import { listOptimistic, tempId } from '@/lib/query/optimistic';
import { sendJson } from '@/lib/query/send-json';
import type { ClientGoal } from '@/lib/query/types';
import type { GoalHorizon, GoalPriority } from '@prisma/client';
import { nullishFields } from '@/lib/query/nullish-fields';

export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals,
    queryFn: fetchGoals,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGoalAchievements(limit = 20) {
  return useQuery({
    queryKey: queryKeys.goalAchievements(limit),
    queryFn: () => fetchGoalAchievements(limit),
    staleTime: 5 * 60 * 1000,
  });
}

export interface GoalPayload {
  title: string;
  kind: 'RACE' | 'METRIC';
  horizon?: string | null;
  metricKey?: string | null;
  startValue?: number | null;
  currentValue?: number | null;
  targetValue?: number | null;
  unit?: string | null;
  lowerIsBetter?: boolean;
  targetDate?: string | null;
  location?: string | null;
  achieved?: boolean;
  notes?: string | null;
  priority?: 'A' | 'B' | 'C' | null;
  raceFormat?: string | null;
  targetPerformance?: string | null;
}

const GOAL_NULLABLE_KEYS = [
  'metricKey',
  'startValue',
  'currentValue',
  'targetValue',
  'unit',
  'location',
  'notes',
  'raceFormat',
  'targetPerformance',
] as const satisfies readonly (keyof GoalPayload)[];

function optimisticGoal(payload: GoalPayload): ClientGoal {
  const now = new Date();
  return {
    id: tempId(),
    title: payload.title,
    kind: payload.kind,
    horizon: (payload.horizon as GoalHorizon | null) ?? null,
    ...nullishFields(payload, GOAL_NULLABLE_KEYS),
    lowerIsBetter: payload.lowerIsBetter ?? false,
    targetDate: payload.targetDate ? new Date(payload.targetDate) : null,
    achieved: payload.achieved ?? false,
    priority: (payload.priority as GoalPriority | null) ?? null,
    createdAt: now,
    updatedAt: now,
  } as ClientGoal;
}

function mergeGoal(goal: ClientGoal, data: Partial<GoalPayload>): ClientGoal {
  const { targetDate: existingTargetDate } = goal;
  let targetDate = existingTargetDate;
  if (data.targetDate !== undefined) {
    targetDate = data.targetDate ? new Date(data.targetDate) : null;
  }

  return {
    ...goal,
    ...data,
    horizon: (data.horizon as GoalHorizon | null) ?? goal.horizon,
    priority:
      data.priority !== undefined
        ? ((data.priority as GoalPriority | null) ?? null)
        : goal.priority,
    targetDate,
    updatedAt: new Date(),
  } as ClientGoal;
}

export function useGoalMutations() {
  const queryClient = useQueryClient();
  const key = queryKeys.goals;
  const invalidateAchievements = () => {
    void queryClient.invalidateQueries({ queryKey: ['goals', 'achievements'] });
  };

  const createOptimistic = listOptimistic<ClientGoal, GoalPayload>({
    queryClient,
    queryKey: key,
    apply: (prev, payload) => [optimisticGoal(payload), ...prev],
    success: (p) => (p.kind === 'RACE' ? 'Course ajoutée' : 'Objectif créé'),
    error: "Impossible de créer l'objectif.",
  });

  const create = useMutation({
    mutationFn: (payload: GoalPayload) => sendJson('/api/goals', 'POST', payload),
    ...createOptimistic,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      invalidateAchievements();
    },
  });

  const updateOptimistic = listOptimistic<ClientGoal, { id: string; data: Partial<GoalPayload> }>({
    queryClient,
    queryKey: key,
    apply: (prev, { id, data }) => prev.map((g) => (g.id === id ? mergeGoal(g, data) : g)),
    error: "Impossible de mettre à jour l'objectif.",
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GoalPayload> }) =>
      sendJson(`/api/goals/${id}`, 'PATCH', data),
    ...updateOptimistic,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      invalidateAchievements();
    },
  });

  const removeOptimistic = listOptimistic<ClientGoal, string>({
    queryClient,
    queryKey: key,
    apply: (prev, id) => prev.filter((g) => g.id !== id),
    success: 'Objectif supprimé',
    error: "Impossible de supprimer l'objectif.",
  });

  const remove = useMutation({
    mutationFn: (id: string) => sendJson(`/api/goals/${id}`, 'DELETE'),
    ...removeOptimistic,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      invalidateAchievements();
    },
  });

  return { create, update, remove };
}
