'use client';

import type { QueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';

/** Identifiant temporaire d'une entité créée de façon optimiste. */
export function tempId(): string {
  return `optimistic-${crypto.randomUUID()}`;
}

export function isTempId(id: string): boolean {
  return id.startsWith('optimistic-');
}

interface ListOptimisticConfig<TItem extends { id: string }, TVars> {
  queryClient: QueryClient;
  queryKey: readonly unknown[];
  /** Transforme la liste en cache à partir des variables de la mutation. */
  apply: (prev: TItem[], vars: TVars) => TItem[];
  /** Message de succès (toast). Silencieux si absent. */
  success?: string | ((vars: TVars) => string | undefined);
  /** Message d'erreur (toast). Un défaut générique est utilisé sinon. */
  error?: string;
}

interface OptimisticContext<TItem> {
  previous: TItem[] | undefined;
}

/**
 * Construit les callbacks de cycle de vie d'une mutation pour un cache de type
 * liste, avec mise à jour optimiste : patch immédiat du cache, rollback + toast
 * en cas d'erreur, resynchronisation au settle.
 *
 * Usage : `useMutation({ mutationFn, ...listOptimistic({ ... }) })`.
 */
export function listOptimistic<TItem extends { id: string }, TVars>({
  queryClient,
  queryKey,
  apply,
  success,
  error,
}: ListOptimisticConfig<TItem, TVars>) {
  return {
    onMutate: async (vars: TVars): Promise<OptimisticContext<TItem>> => {
      // Évite qu'un refetch en cours n'écrase notre patch optimiste.
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
    onSuccess: (_data: unknown, vars: TVars) => {
      const message = typeof success === 'function' ? success(vars) : success;
      if (message) toast.success(message);
    },
    onSettled: () => {
      // Resynchronise avec la vérité serveur (remplace les entités temporaires).
      queryClient.invalidateQueries({ queryKey });
    },
  };
}
