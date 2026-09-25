import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isTempId, listOptimistic, tempId } from '@/lib/query/optimistic';

vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

type Item = { id: string; title: string };

describe('tempId / isTempId', () => {
  it('creates optimistic-prefixed ids', () => {
    const id = tempId();
    expect(isTempId(id)).toBe(true);
    expect(isTempId('real-id')).toBe(false);
  });
});

describe('listOptimistic', () => {
  let queryClient: QueryClient;
  const key = ['items'] as const;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData<Item[]>(key, [
      { id: 'a', title: 'Alpha' },
      { id: 'b', title: 'Beta' },
    ]);
  });

  it('patches the list on mutate and restores on error', async () => {
    const lifecycle = listOptimistic<Item, string>({
      queryClient,
      queryKey: key,
      apply: (prev, id) => prev.filter((item) => item.id !== id),
      error: 'delete failed',
    });

    const ctx = await lifecycle.onMutate('a');
    expect(queryClient.getQueryData<Item[]>(key)?.map((i) => i.id)).toEqual(['b']);

    lifecycle.onError(new Error('nope'), 'a', ctx);
    expect(queryClient.getQueryData<Item[]>(key)?.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('reconciles server entity on success without requiring settle invalidate', async () => {
    const lifecycle = listOptimistic<Item, { title: string }, Item>({
      queryClient,
      queryKey: key,
      apply: (prev, vars) => [{ id: tempId(), title: vars.title }, ...prev],
      reconcile: (prev, data) => [data, ...prev.filter((item) => !isTempId(item.id))],
      invalidateOnSettle: false,
      success: 'created',
    });

    await lifecycle.onMutate({ title: 'Gamma' });
    const afterOptimistic = queryClient.getQueryData<Item[]>(key)!;
    expect(afterOptimistic).toHaveLength(3);
    expect(isTempId(afterOptimistic[0]!.id)).toBe(true);

    lifecycle.onSuccess({ id: 'server-1', title: 'Gamma' }, { title: 'Gamma' });
    const afterSuccess = queryClient.getQueryData<Item[]>(key)!;
    expect(afterSuccess[0]).toEqual({ id: 'server-1', title: 'Gamma' });
    expect(afterSuccess.some((item) => isTempId(item.id))).toBe(false);
  });
});
