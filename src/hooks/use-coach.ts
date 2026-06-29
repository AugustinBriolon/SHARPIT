"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ActivityType, SessionIntensity } from "@prisma/client";
import { queryKeys } from "@/lib/client/keys";

export interface GeneratedSession {
  dayOffset: number;
  date: string; // yyyy-MM-dd
  startTime: string | null; // HH:mm
  type: ActivityType;
  intensity: SessionIntensity;
  title: string;
  description: string;
  durationMin: number;
  load: number;
  rationale: string;
}

export interface GeneratedPlan {
  summary: string;
  startDate: string;
  sessions: GeneratedSession[];
}

export interface GeneratePlanParams {
  startDate?: string;
  days?: number;
  focus?: string;
  goalId?: string | null;
}

export function useCoachPlan() {
  return useMutation<GeneratedPlan, Error, GeneratePlanParams>({
    mutationFn: async (params) => {
      const res = await fetch("/api/coach/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "La génération a échoué.");
      }
      return data as GeneratedPlan;
    },
  });
}

export type AdaptAction = "MODIFY" | "REMOVE" | "ADD";

export interface AdaptChange {
  action: AdaptAction;
  sessionId: string | null;
  date: string | null;
  type: ActivityType | null;
  intensity: SessionIntensity | null;
  title: string | null;
  description: string | null;
  durationMin: number | null;
  load: number | null;
  reason: string;
}

export interface AdaptPlanResult {
  summary: string;
  changes: AdaptChange[];
}

export function useAdaptPlan() {
  return useMutation<AdaptPlanResult, Error, { days?: number; focus?: string }>({
    mutationFn: async (params) => {
      const res = await fetch("/api/coach/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "La réadaptation a échoué.");
      }
      return data as AdaptPlanResult;
    },
  });
}

export function useCoachContext() {
  return useQuery({
    queryKey: queryKeys.coachContext,
    queryFn: async (): Promise<string> => {
      const res = await fetch("/api/coach/context");
      if (!res.ok) throw new Error("Impossible de charger le contexte.");
      const data = (await res.json()) as { context: string };
      return data.context ?? "";
    },
  });
}

export function useSaveCoachContext() {
  const queryClient = useQueryClient();
  return useMutation<string, Error, string>({
    mutationFn: async (context) => {
      const res = await fetch("/api/coach/context", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Enregistrement impossible.");
      }
      return (data as { context: string }).context ?? "";
    },
    onSuccess: (context) => {
      queryClient.setQueryData(queryKeys.coachContext, context);
    },
  });
}
