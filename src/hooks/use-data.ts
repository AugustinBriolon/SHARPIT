'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from '@/components/ui/toast';
import {
  fetchActivities,
  fetchActivityStream,
  fetchMultisportStreams,
  fetchAthleteProfile,
  fetchGoals,
  fetchGoalAchievements,
  fetchGoogleCalendars,
  fetchGoogleEvents,
  fetchHealthEntries,
  fetchBodyCompositionEntries,
  fetchRecords,
  fetchThresholdHistory,
  fetchThresholdPreview,
  fetchTrainingPlan,
} from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';
import { listOptimistic, tempId, isTempId } from '@/lib/query/optimistic';
import { sendJson } from '@/lib/query/send-json';
import type { ClientActivity, ClientGoal } from '@/lib/query/types';
import type { createActivitySchema } from '@/lib/validators/activity';
import type { GoalHorizon, GoalPriority } from '@prisma/client';
import type { z } from 'zod';

export {
  useAnalyzeBrick,
  useBrickAnalysis,
  usePlannedSessionMutations,
  usePlannedSessionPresentation,
  usePlannedSessions,
  useSessionRationalePresentation,
  useWeeklyCoachingBriefViewModel,
} from '@/hooks/use-planned-sessions';
export type {
  BrickLegPayload,
  ClientBrickAnalysis,
  CreateBrickPayload,
  PlannedSessionBatchOp,
  PlannedSessionPayload,
} from '@/hooks/use-planned-sessions';

// 90 j couvrent largement le dashboard (tendances 7-30 j) et Recovery (courbes 60 j).
// Tirer 365 j était surdimensionné (réseau + parsing inutiles).
const DEFAULT_HEALTH_DAYS = 90;

export function useActivities() {
  return useQuery({
    queryKey: queryKeys.activities,
    queryFn: fetchActivities,
    // Historique partagé par 8 vues : on évite un refetch complet à chaque
    // montage / retour de focus. Les mutations invalident explicitement.
    staleTime: 2 * 60 * 1000,
  });
}

export type ActivityMutationPayload = z.input<typeof createActivitySchema>;

function optimisticActivity(payload: ActivityMutationPayload): ClientActivity {
  const now = new Date();
  const date = payload.date instanceof Date ? payload.date : new Date(payload.date as string);
  return {
    id: tempId(),
    type: payload.type,
    date,
    title: payload.title ?? null,
    duration: payload.duration ?? null,
    load: payload.load ?? null,
    rpe: payload.rpe ?? null,
    feeling: payload.feeling ?? null,
    weather: payload.weather ?? null,
    notes: payload.notes ?? null,
    source: 'manual',
    stravaId: null,
    garminId: null,
    createdAt: now,
    updatedAt: now,
    runMetrics:
      payload.runMetrics?.distanceM != null ? { distanceM: payload.runMetrics.distanceM } : null,
    bikeMetrics:
      payload.bikeMetrics?.tss != null || payload.bikeMetrics?.avgPower != null
        ? { tss: payload.bikeMetrics.tss ?? null, avgPower: payload.bikeMetrics.avgPower ?? null }
        : null,
    swimMetrics:
      payload.swimMetrics?.distanceM != null ? { distanceM: payload.swimMetrics.distanceM } : null,
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
        if (withoutTemp.some((a) => a.id === data.id)) return withoutTemp;
        const optimistic = prev.find((a) => isTempId(a.id));
        if (!optimistic) return withoutTemp;
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
          if (a.id !== id) return a;
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

export function useHealthEntries(days = DEFAULT_HEALTH_DAYS, refDate?: Date) {
  const dateKey = refDate ? format(refDate, 'yyyy-MM-dd') : undefined;
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: queryKeys.health(days, dateKey),
    queryFn: () => fetchHealthEntries(days, dateKey),
    staleTime: 2 * 60 * 1000,
  });
}

export function useBodyComposition(days?: number) {
  return useQuery({
    queryKey: queryKeys.bodyComposition(days),
    queryFn: () => fetchBodyCompositionEntries(days),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });
}

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

function optimisticGoal(payload: GoalPayload): ClientGoal {
  const now = new Date();
  return {
    id: tempId(),
    title: payload.title,
    kind: payload.kind,
    horizon: (payload.horizon as GoalHorizon | null) ?? null,
    metricKey: payload.metricKey ?? null,
    startValue: payload.startValue ?? null,
    currentValue: payload.currentValue ?? null,
    targetValue: payload.targetValue ?? null,
    unit: payload.unit ?? null,
    lowerIsBetter: payload.lowerIsBetter ?? false,
    targetDate: payload.targetDate ? new Date(payload.targetDate) : null,
    location: payload.location ?? null,
    achieved: payload.achieved ?? false,
    notes: payload.notes ?? null,
    priority: (payload.priority as GoalPriority | null) ?? null,
    raceFormat: payload.raceFormat ?? null,
    targetPerformance: payload.targetPerformance ?? null,
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

export function useRecords() {
  return useQuery({
    queryKey: queryKeys.records,
    // Records persistés en base : on évite de refetcher à chaque visite.
    queryFn: fetchRecords,
    staleTime: 30 * 60 * 1000,
  });
}

export function useAthleteProfile() {
  return useQuery({
    queryKey: queryKeys.athleteProfile,
    queryFn: fetchAthleteProfile,
    staleTime: 5 * 60 * 1000,
  });
}

export function useThresholdPreview() {
  return useQuery({
    queryKey: queryKeys.thresholdPreview,
    queryFn: fetchThresholdPreview,
    staleTime: 5 * 60 * 1000,
  });
}

export function useThresholdHistory() {
  return useQuery({
    queryKey: queryKeys.thresholdHistory,
    queryFn: fetchThresholdHistory,
    staleTime: 60 * 1000,
  });
}

export function useTrainingPlan() {
  return useQuery({
    queryKey: queryKeys.trainingPlan,
    queryFn: fetchTrainingPlan,
    staleTime: 60 * 1000,
  });
}

export function useTrainingPlanMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.trainingPlan });

  const generate = useMutation({
    mutationFn: (goalId: string) => sendJson('/api/training-plans', 'POST', { goalId }),
    onSuccess: () => {
      invalidate();
      toast.success("Plan d'entraînement généré");
    },
    onError: (err: unknown) =>
      toast.error('La génération du plan a échoué.', {
        description: err instanceof Error ? err.message : undefined,
      }),
  });

  const archive = useMutation({
    mutationFn: (id: string) => sendJson(`/api/training-plans/${id}`, 'DELETE'),
    onSuccess: invalidate,
    onError: (err: unknown) =>
      toast.error("Impossible d'archiver le plan.", {
        description: err instanceof Error ? err.message : undefined,
      }),
  });

  return { generate, archive };
}

export function useApplyThresholdEstimates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sendJson('/api/athlete-profile/apply-estimates', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.thresholdPreview });
      queryClient.invalidateQueries({ queryKey: queryKeys.thresholdHistory });
    },
  });
}

export function useActivityStream(id: string) {
  return useQuery({
    queryKey: queryKeys.activityStream(id),
    queryFn: () => fetchActivityStream(id),
    staleTime: Infinity, // données figées d'une activité passée
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

export function useGoogleEvents(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.googleEvents(from, to),
    queryFn: () => fetchGoogleEvents(from, to),
    staleTime: 5 * 60 * 1000, // 5 min : évite de spammer l'API Google
    retry: 1,
  });
}

export function useGoogleCalendars(enabled = true) {
  return useQuery({
    queryKey: queryKeys.googleCalendars,
    queryFn: fetchGoogleCalendars,
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
