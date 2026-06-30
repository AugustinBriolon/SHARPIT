"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchActivities,
  fetchActivityStream,
  fetchGoals,
  fetchGoogleCalendars,
  fetchGoogleEvents,
  fetchHealthEntries,
  fetchPlannedSessions,
  fetchRecords,
  fetchThresholdHistory,
  fetchThresholdPreview,
  fetchTrainingPlan,
} from "@/lib/client/fetchers";
import { queryKeys } from "@/lib/client/keys";
import type { BrickAnalysis } from "@/lib/validators/coach";
import type { ActivityType, SessionIntensity } from "@prisma/client";

const DEFAULT_HEALTH_DAYS = 365;

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

export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals,
    queryFn: fetchGoals,
  });
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
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.trainingPlan });

  const generate = useMutation({
    mutationFn: (goalId: string) =>
      sendJson("/api/training-plans", "POST", { goalId }),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: (id: string) =>
      sendJson(`/api/training-plans/${id}`, "DELETE"),
    onSuccess: invalidate,
  });

  return { generate, archive };
}

export function useApplyThresholdEstimates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sendJson("/api/athlete-profile/apply-estimates", "POST"),
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
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(data?.error ?? "Une erreur est survenue");
  }
  return res.json();
}

export function usePlannedSessionMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });

  const create = useMutation({
    mutationFn: (payload: PlannedSessionPayload) =>
      sendJson("/api/planned-sessions", "POST", payload),
    onSuccess: invalidate,
  });

  const createBrick = useMutation({
    mutationFn: (payload: CreateBrickPayload) =>
      sendJson("/api/planned-sessions/brick", "POST", payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<PlannedSessionPayload>;
    }) => sendJson(`/api/planned-sessions/${id}`, "PATCH", data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      sendJson(`/api/planned-sessions/${id}`, "DELETE"),
    onSuccess: invalidate,
  });

  const link = useMutation({
    mutationFn: ({
      id,
      activityId,
    }: {
      id: string;
      activityId: string | null;
    }) => sendJson(`/api/planned-sessions/${id}/link`, "POST", { activityId }),
    onSuccess: invalidate,
  });

  const analyze = useMutation({
    mutationFn: (id: string) =>
      sendJson(`/api/planned-sessions/${id}/analyze`, "POST"),
    onSuccess: invalidate,
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
    queryKey: queryKeys.brickAnalysis(brickGroupId ?? ""),
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
      const res = await fetch("/api/planned-sessions/brick/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      queryClient.setQueryData(
        queryKeys.brickAnalysis(data.brickGroupId),
        data,
      );
    },
  });
}
