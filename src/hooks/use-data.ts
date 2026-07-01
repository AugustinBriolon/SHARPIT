'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import {
  fetchActivities,
  fetchActivityStream,
  fetchAthleteProfile,
  fetchGoals,
  fetchGoogleCalendars,
  fetchGoogleEvents,
  fetchHealthEntries,
  fetchBodyCompositionEntries,
  fetchPlannedSessions,
  fetchRecords,
  fetchThresholdHistory,
  fetchThresholdPreview,
  fetchTrainingPlan,
} from '@/lib/client/fetchers';
import { queryKeys } from '@/lib/client/keys';
import { listOptimistic, tempId } from '@/lib/client/optimistic';
import type { ClientGoal, ClientPlannedSession } from '@/lib/client/types';
import type { BrickAnalysis } from '@/lib/validators/coach';
import type { ActivityType, GoalHorizon, GoalPriority, SessionIntensity } from '@prisma/client';

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

export function useHealthEntries(days = DEFAULT_HEALTH_DAYS) {
  return useQuery({
    queryKey: queryKeys.health(days),
    queryFn: () => fetchHealthEntries(days),
    staleTime: 2 * 60 * 1000,
  });
}

export function useBodyComposition(days = 90) {
  return useQuery({
    queryKey: queryKeys.bodyComposition(days),
    queryFn: () => fetchBodyCompositionEntries(days),
    staleTime: 2 * 60 * 1000,
  });
}

export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals,
    queryFn: fetchGoals,
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
  return {
    ...goal,
    ...data,
    horizon: (data.horizon as GoalHorizon | null) ?? goal.horizon,
    priority:
      data.priority !== undefined
        ? ((data.priority as GoalPriority | null) ?? null)
        : goal.priority,
    targetDate:
      data.targetDate !== undefined
        ? data.targetDate
          ? new Date(data.targetDate)
          : null
        : goal.targetDate,
    updatedAt: new Date(),
  } as ClientGoal;
}

export function useGoalMutations() {
  const queryClient = useQueryClient();
  const key = queryKeys.goals;

  const create = useMutation({
    mutationFn: (payload: GoalPayload) => sendJson('/api/goals', 'POST', payload),
    ...listOptimistic<ClientGoal, GoalPayload>({
      queryClient,
      queryKey: key,
      apply: (prev, payload) => [optimisticGoal(payload), ...prev],
      success: (p) => (p.kind === 'RACE' ? 'Course ajoutée' : 'Objectif créé'),
      error: "Impossible de créer l'objectif.",
    }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GoalPayload> }) =>
      sendJson(`/api/goals/${id}`, 'PATCH', data),
    ...listOptimistic<ClientGoal, { id: string; data: Partial<GoalPayload> }>({
      queryClient,
      queryKey: key,
      apply: (prev, { id, data }) => prev.map((g) => (g.id === id ? mergeGoal(g, data) : g)),
      error: "Impossible de mettre à jour l'objectif.",
    }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => sendJson(`/api/goals/${id}`, 'DELETE'),
    ...listOptimistic<ClientGoal, string>({
      queryClient,
      queryKey: key,
      apply: (prev, id) => prev.filter((g) => g.id !== id),
      success: 'Objectif supprimé',
      error: "Impossible de supprimer l'objectif.",
    }),
  });

  return { create, update, remove };
}

export function usePlannedSessions() {
  return useQuery({
    queryKey: queryKeys.plannedSessions,
    queryFn: fetchPlannedSessions,
  });
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
    staleTime: 0,
    retry: 1,
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

async function sendJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      error?: string;
      details?: { fieldErrors?: Record<string, string[]> };
    } | null;
    let message = data?.error ?? 'Une erreur est survenue';
    const fieldErr = data?.details?.fieldErrors;
    if (fieldErr) {
      const [first] = Object.values(fieldErr).flat();
      if (first) message = first;
    }
    throw new Error(message);
  }
  return res.json();
}

function optimisticSession(
  payload: PlannedSessionPayload,
  brick?: { groupId: string; order: number },
): ClientPlannedSession {
  const now = new Date();
  return {
    id: tempId(),
    type: payload.type,
    date: payload.date,
    startTime: payload.startTime ?? null,
    title: payload.title ?? null,
    description: payload.description ?? null,
    durationMin: payload.durationMin ?? null,
    load: payload.load ?? null,
    intensity: payload.intensity ?? null,
    completed: payload.completed ?? false,
    goalId: payload.goalId ?? null,
    brickGroupId: brick?.groupId ?? null,
    brickOrder: brick?.order ?? null,
    activityId: null,
    analysis: null,
    analyzedAt: null,
    googleEventId: null,
    createdAt: now,
    updatedAt: now,
    activity: null,
  } as unknown as ClientPlannedSession;
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
      apply: (prev, payload) => [...prev, optimisticSession(payload)],
      success: 'Séance ajoutée',
      error: "Impossible d'ajouter la séance.",
    }),
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
          optimisticSession(
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

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PlannedSessionPayload> }) =>
      sendJson(`/api/planned-sessions/${id}`, 'PATCH', data),
    ...listOptimistic<ClientPlannedSession, { id: string; data: Partial<PlannedSessionPayload> }>({
      queryClient,
      queryKey: key,
      apply: (prev, { id, data }) =>
        prev.map((s) =>
          s.id === id ? ({ ...s, ...data, updatedAt: new Date() } as ClientPlannedSession) : s,
        ),
      error: 'Impossible de mettre à jour la séance.',
    }),
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

  // Lier une activité réalisée : l'objet `activity` complet n'est connu qu'après
  // réponse serveur, donc pas d'optimistic (on invalide simplement). La liaison
  // répond vite ; on enchaîne l'analyse IA côté client (non bloquante).
  const link = useMutation({
    mutationFn: ({ id, activityId }: { id: string; activityId: string | null }) =>
      sendJson(`/api/planned-sessions/${id}/link`, 'POST', { activityId }),
    onSuccess: (_data, variables) => {
      invalidate();
      if (variables.activityId) {
        analyze.mutate(variables.id);
      }
    },
    onError: (err: unknown) =>
      toast.error('La liaison a échoué.', {
        description: err instanceof Error ? err.message : undefined,
      }),
  });

  return { create, createBrick, update, remove, link, analyze };
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
