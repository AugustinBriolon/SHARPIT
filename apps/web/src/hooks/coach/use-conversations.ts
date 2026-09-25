'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import {
  fetchConversation,
  fetchConversations,
  type ClientConversation,
  type ClientConversationSummary,
} from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';

let createConversationPromise: Promise<ClientConversation> | null = null;

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
      if (createConversationPromise) {
        return createConversationPromise;
      }

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
          if (!existing || existing.length === 0) {
            return [summary];
          }
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
          if (!existing) {
            return existing;
          }
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
          if (!existing) {
            return [data];
          }
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
