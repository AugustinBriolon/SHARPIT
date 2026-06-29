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
} from "@/lib/client/fetchers";
import { queryKeys } from "@/lib/client/keys";
import type { ActivityType, SessionIntensity } from "@prisma/client";

const DEFAULT_HEALTH_DAYS = 365;

export function useActivities() {
  return useQuery({
    queryKey: queryKeys.activities,
    queryFn: fetchActivities,
  });
}

export function useHealthEntries(days = DEFAULT_HEALTH_DAYS) {
  return useQuery({
    queryKey: queryKeys.health(days),
    queryFn: () => fetchHealthEntries(days),
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

  return { create, update, remove, link, analyze };
}
