import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { patchPlannedSessionAnalysisInCaches } from '@/lib/query/patch-planned-session-analysis-cache';

function seedCaches(queryClient: QueryClient) {
  queryClient.setQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions, [
    { id: 'ps-1', analysis: null, analyzedAt: null } as ClientPlannedSession,
  ]);
  queryClient.setQueryData<ClientActivity[]>(queryKeys.activities, [
    {
      id: 'act-1',
      plannedSession: { id: 'ps-1', analysis: null, analyzedAt: null },
    } as ClientActivity,
  ]);
}

describe('patchPlannedSessionAnalysisInCaches', () => {
  it('updates planned sessions and nested activity.plannedSession', () => {
    const queryClient = new QueryClient();
    const analyzedAt = new Date('2026-08-28T10:00:00.000Z');
    const analysis = { complianceScore: 88, verdict: 'ON_TARGET' as const, remarks: [] };

    seedCaches(queryClient);
    patchPlannedSessionAnalysisInCaches(queryClient, 'ps-1', { analysis, analyzedAt });

    const session = queryClient.getQueryData<ClientPlannedSession[]>(
      queryKeys.plannedSessions,
    )?.[0];
    const activity = queryClient.getQueryData<ClientActivity[]>(queryKeys.activities)?.[0];

    expect(session?.analysis).toEqual(analysis);
    expect(activity?.plannedSession?.analysis).toEqual(analysis);
  });
});
