'use client';

import type { QueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';

/** Temporary entity id for optimistic creates. */
export function tempId(): string {
  return `optimistic-${crypto.randomUUID()}`;
}

export function isTempId(id: string): boolean {
  return id.startsWith('optimistic-');
}

interface ListOptimisticConfig<TItem extends { id: string }, TVars, TData = unknown> {
  queryClient: QueryClient;
  queryKey: readonly unknown[];
  /** Transforms the cached list from mutation variables. */
  apply: (prev: TItem[], vars: TVars) => TItem[];
  /**
   * Optional: replace optimistic rows with the server payload on success.
   * Prefer this over a full invalidate when the response shape is known.
   */
  reconcile?: (prev: TItem[], data: TData, vars: TVars) => TItem[];
  /**
   * When false, skip settle invalidation (use when `reconcile` is enough).
   * Defaults to true for backward-compatible server resync.
   */
  invalidateOnSettle?: boolean;
  /** Success toast. Silent when omitted. */
  success?: string | ((vars: TVars) => string | undefined);
  /** Error toast. Generic fallback otherwise. */
  error?: string;
}

interface OptimisticContext<TItem> {
  previous: TItem[] | undefined;
}

/**
 * List-cache mutation lifecycle: optimistic patch, rollback + toast on error,
 * optional reconcile on success, optional settle invalidation.
 *
 * Usage: `useMutation({ mutationFn, ...listOptimistic({ ... }) })`.
 */
export function listOptimistic<TItem extends { id: string }, TVars, TData = unknown>({
  queryClient,
  queryKey,
  apply,
  reconcile,
  invalidateOnSettle = true,
  success,
  error,
}: ListOptimisticConfig<TItem, TVars, TData>) {
  return {
    onMutate: async (vars: TVars): Promise<OptimisticContext<TItem>> => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TItem[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<TItem[]>(queryKey, apply(previous, vars));
      }
      return { previous };
    },
    onError: (err: unknown, _vars: TVars, context: OptimisticContext<TItem> | undefined) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(error ?? "L'action a échoué, rien n'a été enregistré.", {
        description: err instanceof Error ? err.message : undefined,
      });
    },
    onSuccess: (data: TData, vars: TVars) => {
      if (reconcile) {
        queryClient.setQueryData<TItem[]>(queryKey, (prev) =>
          prev ? reconcile(prev, data, vars) : prev,
        );
      }
      const message = typeof success === 'function' ? success(vars) : success;
      if (message) toast.success(message);
    },
    onSettled: () => {
      if (invalidateOnSettle) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  };
}
