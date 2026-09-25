import { describe, expect, it, vi } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';
import { invalidateAfterAthleteProfileSave } from '@/lib/query/invalidate-after-athlete-profile-save';
import { queryKeys } from '@/lib/query/keys';

function mockQueryClient() {
  const invalidateQueries = vi.fn(async (_opts: { queryKey: readonly unknown[] }) => undefined);
  return {
    client: { invalidateQueries } as unknown as QueryClient,
    invalidateQueries,
  };
}

describe('invalidateAfterAthleteProfileSave', () => {
  it('invalidates profile, thresholds, twin, and today caches', async () => {
    const { client, invalidateQueries } = mockQueryClient();

    await invalidateAfterAthleteProfileSave(client, { trainingDayId: '2026-07-22' });

    const keys = invalidateQueries.mock.calls.map((call) => call[0].queryKey);

    expect(keys).toEqual(
      expect.arrayContaining([
        queryKeys.athleteProfile,
        queryKeys.thresholdPreview,
        queryKeys.thresholdHistory,
        ['activity-stream'],
        ['presentation'],
        ['athlete-snapshot'],
        ['today'],
        queryKeys.athleteSnapshot('2026-07-22'),
        queryKeys.presentationToday('2026-07-22'),
        queryKeys.today('2026-07-22'),
      ]),
    );
  });
});
