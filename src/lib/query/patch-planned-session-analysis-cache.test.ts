import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { patchPlannedSessionAnalysisInCaches } from '@/lib/query/patch-planned-session-analysis-cache';

function seedCaches(queryClient: QueryClient) {
  queryClient.setQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions, [
    { id: 'ps-1', analysis: null, analyzedAt: null } as unknown as ClientPlannedSession,
  ]);
  queryClient.setQueryData<ClientActivity[]>(queryKeys.activities, [
    {
      id: 'act-1',
      plannedSession: { id: 'ps-1', analysis: null, analyzedAt: null },
    } as unknown as ClientActivity,
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

  it('clears analysis including activity detail cache', () => {
    const queryClient = new QueryClient();
    const analyzedAt = new Date('2026-08-28T10:00:00.000Z');
    const analysis = { complianceScore: 88, verdict: 'ON_TARGET' as const, remarks: [] };
    seedCaches(queryClient);
    queryClient.setQueryData(queryKeys.activity('act-1'), {
      id: 'act-1',
      plannedSession: { id: 'ps-1', analysis, analyzedAt },
    });

    patchPlannedSessionAnalysisInCaches(queryClient, 'ps-1', {
      analysis: null,
      analyzedAt: null,
    });

    const detail = queryClient.getQueryData<{
      plannedSession: { analysis: unknown; analyzedAt: unknown };
    }>(queryKeys.activity('act-1'));
    expect(detail?.plannedSession?.analysis).toBeNull();
    expect(detail?.plannedSession?.analyzedAt).toBeNull();
  });
});
