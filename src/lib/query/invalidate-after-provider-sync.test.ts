import { describe, expect, it, vi } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';
import { invalidateAfterProviderSync } from '@/lib/query/invalidate-after-provider-sync';

function mockQueryClient() {
  const invalidateQueries = vi.fn(async (_opts: { queryKey: readonly unknown[] }) => undefined);
  return {
    client: { invalidateQueries } as unknown as QueryClient,
    invalidateQueries,
  };
}

describe('invalidateAfterProviderSync', () => {
  it('invalidates Today, planned sessions, and presentation — not only activities', async () => {
    const { client, invalidateQueries } = mockQueryClient();

    await invalidateAfterProviderSync(client, {
      trainingDayId: '2026-07-20',
      deferMs: 0,
    });

    const keys = invalidateQueries.mock.calls.map((call) => call[0].queryKey);

    expect(keys).toEqual(
      expect.arrayContaining([
        ['activities'],
        ['records'],
        ['planned-sessions'],
        ['health'],
        ['presentation'],
        ['athlete-snapshot'],
        ['today'],
        ['athlete-snapshot', '2026-07-20'],
        ['presentation', 'today', '2026-07-20'],
        ['today', '2026-07-20'],
        ['body-composition', 'all'],
      ]),
    );
  });

  it('can skip body composition', async () => {
    const { client, invalidateQueries } = mockQueryClient();

    await invalidateAfterProviderSync(client, {
      trainingDayId: '2026-07-20',
      deferMs: 0,
      includeBodyComposition: false,
    });

    const keys = invalidateQueries.mock.calls.map((call) => call[0].queryKey);
    expect(keys.some((k) => k[0] === 'body-composition')).toBe(false);
  });
});
