'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import type { ActivityType, SessionIntensity } from '@prisma/client';
import {
  fetchConversation,
  fetchConversations,
  fetchDailyBriefing,
  fetchWeeklyReview,
  type ClientConversation,
  type ClientConversationSummary,
  type ClientDailyBriefing,
  type ClientWeeklyReview,
} from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';
import type { CoachMemoryResponse } from '@/hooks/use-coach-memory';
import type { GateResult } from '@/lib/plan-gate/types';

let createConversationPromise: Promise<ClientConversation> | null = null;

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
  /** Origin CoachingDecision id — null when the Gate rejected the proposal outright. */
  decisionId: string | null;
}

export interface GeneratedPlan {
  summary: string;
  startDate: string;
  sessions: GeneratedSession[];
  gate: GateResult;
}

export interface GeneratePlanParams {
  startDate?: string;
  days?: number;
  focus?: string;
  goalId?: string | null;
  targetLoad?: number | null;
  planPhase?: string | null;
  planFocus?: string | null;
}

export function useCoachPlan() {
  return useMutation<GeneratedPlan, Error, GeneratePlanParams>({
    mutationFn: async (params) => {
      const res = await fetch('/api/coach/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? 'La génération a échoué.');
      }
      return data as GeneratedPlan;
    },
  });
}

export type AdaptAction = 'MODIFY' | 'REMOVE' | 'ADD';

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
  /** Origin CoachingDecision id — null for REMOVE changes and non-gated proposals. */
  decisionId: string | null;
}

export interface AdaptPlanResult {
  summary: string;
  changes: AdaptChange[];
  gate: GateResult;
}

export function useAdaptPlan() {
  return useMutation<AdaptPlanResult, Error, { days?: number; focus?: string }>({
    mutationFn: async (params) => {
      const res = await fetch('/api/coach/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? 'La réadaptation a échoué.');
      }
      return data as AdaptPlanResult;
    },
  });
}

export function useCoachContext() {
  return useQuery({
    queryKey: queryKeys.coachContext,
    queryFn: async (): Promise<string> => {
      const res = await fetch('/api/coach/context');
      if (!res.ok) throw new Error('Impossible de charger le contexte.');
      const data = (await res.json()) as { context: string };
      return data.context ?? '';
    },
  });
}

export function useSaveCoachContext() {
  const queryClient = useQueryClient();
  return useMutation<string, Error, string>({
    mutationFn: async (context) => {
      const res = await fetch('/api/coach/context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? 'Enregistrement impossible.');
      }
      return (data as { context: string }).context ?? '';
    },
    onSuccess: (context) => {
      queryClient.setQueryData(queryKeys.coachContext, context);
      queryClient.setQueryData<CoachMemoryResponse>(queryKeys.coachMemory, (current) =>
        current
          ? { ...current, profileContext: context }
          : { entries: [], activeId: null, profileContext: context },
      );
    },
  });
}

export function useDailyBriefing(date: string) {
  return useQuery({
    queryKey: queryKeys.dailyBriefing(date),
    queryFn: () => fetchDailyBriefing(date),
  });
}

export function useGenerateBriefing() {
  const queryClient = useQueryClient();
  return useMutation<ClientDailyBriefing, Error, string>({
    mutationFn: async (date) => {
      const res = await fetch('/api/coach/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? 'Génération du bilan impossible.');
      }
      const b = data.briefing;
      return {
        id: b.id,
        date: b.date,
        content: b.content,
        readiness: b.readiness ?? null,
        generatedAt: new Date(b.generatedAt),
      } as ClientDailyBriefing;
    },
    onSuccess: (briefing, date) => {
      queryClient.setQueryData(queryKeys.dailyBriefing(date), briefing);
    },
  });
}

export function useWeeklyReview(date: string) {
  return useQuery({
    queryKey: queryKeys.weeklyReview(date),
    queryFn: () => fetchWeeklyReview(date),
  });
}

export function useGenerateWeeklyReview() {
  const queryClient = useQueryClient();
  return useMutation<ClientWeeklyReview, Error, string>({
    mutationFn: async (date) => {
      const res = await fetch('/api/coach/weekly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? 'Génération de la rétro impossible.');
      }
      const r = data.review;
      return {
        id: r.id,
        weekStart: new Date(r.weekStart),
        content: r.content,
        generatedAt: new Date(r.generatedAt),
      } as ClientWeeklyReview;
    },
    onSuccess: (review, date) => {
      queryClient.setQueryData(queryKeys.weeklyReview(date), review);
    },
  });
}

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn: fetchConversations,
    staleTime: 2 * 60_000,
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: queryKeys.conversation(id ?? ''),
    queryFn: () => fetchConversation(id!),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation<
    ClientConversation,
    Error,
    { bootstrapKey?: string; messages?: UIMessage[] } | void
  >({
    mutationFn: async (input) => {
      if (createConversationPromise) return createConversationPromise;

      createConversationPromise = (async () => {
        const body =
          input && typeof input === 'object'
            ? {
                ...(input.bootstrapKey ? { bootstrapKey: input.bootstrapKey } : {}),
                ...(input.messages ? { messages: input.messages } : {}),
              }
            : {};
        const res = await fetch('/api/coach/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error ?? 'Création impossible.');
        }
        return {
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
        } as ClientConversation;
      })();

      try {
        return await createConversationPromise;
      } finally {
        createConversationPromise = null;
      }
    },
    onSuccess: (conversation) => {
      queryClient.setQueryData(queryKeys.conversation(conversation.id), conversation);
      queryClient.setQueryData<ClientConversationSummary[] | undefined>(
        queryKeys.conversations,
        (existing) => {
          const summary: ClientConversationSummary = {
            id: conversation.id,
            title: conversation.title,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          };
          if (!existing || existing.length === 0) return [summary];
          const withoutDuplicate = existing.filter((item) => item.id !== conversation.id);
          return [summary, ...withoutDuplicate];
        },
      );
    },
  });
}

export function useSaveConversation() {
  const queryClient = useQueryClient();
  return useMutation<ClientConversation, Error, { id: string; messages: UIMessage[] }>({
    mutationFn: async ({ id, messages }) => {
      const res = await fetch(`/api/coach/conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? 'Enregistrement impossible.');
      }
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      } as ClientConversation;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.conversation(data.id), data);
      queryClient.setQueryData<ClientConversationSummary[] | undefined>(
        queryKeys.conversations,
        (existing) => {
          if (!existing) return existing;
          return existing.map((item) =>
            item.id === data.id
              ? {
                  ...item,
                  title: data.title,
                  updatedAt: data.updatedAt,
                }
              : item,
          );
        },
      );
    },
  });
}

export function useRenameConversation() {
  const queryClient = useQueryClient();
  return useMutation<
    ClientConversationSummary,
    Error,
    { id: string; title: string },
    { previous: ClientConversationSummary[] | undefined }
  >({
    mutationFn: async ({ id, title }) => {
      const res = await fetch(`/api/coach/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? 'Renommage impossible.');
      }
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      } as ClientConversationSummary;
    },
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.conversations });
      const previous = queryClient.getQueryData<ClientConversationSummary[]>(
        queryKeys.conversations,
      );
      if (previous) {
        queryClient.setQueryData(
          queryKeys.conversations,
          previous.map((item) => (item.id === id ? { ...item, title } : item)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.conversations, context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData<ClientConversationSummary[] | undefined>(
        queryKeys.conversations,
        (existing) => {
          if (!existing) return [data];
          return existing.map((item) => (item.id === data.id ? data : item));
        },
      );
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string, { previous: ClientConversationSummary[] | undefined }>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/coach/conversations/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Suppression impossible.');
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.conversations });
      const previous = queryClient.getQueryData<ClientConversationSummary[]>(
        queryKeys.conversations,
      );
      if (previous) {
        queryClient.setQueryData(
          queryKeys.conversations,
          previous.filter((item) => item.id !== id),
        );
      }
      queryClient.removeQueries({ queryKey: queryKeys.conversation(id) });
      return { previous };
    },
    onError: (_err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.conversations, context.previous);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversation(id) });
    },
  });
}
