import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import {
  beginPlannedSessionReanalysis,
  rollbackPlannedSessionReanalysis,
} from '@/lib/query/begin-planned-session-reanalysis';

const analysis = { complianceScore: 88, verdict: 'ON_TARGET' as const, remarks: [] };
const analyzedAt = new Date('2026-08-28T10:00:00.000Z');

function seedCaches(queryClient: QueryClient) {
  queryClient.setQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions, [
    { id: 'ps-1', analysis, analyzedAt } as unknown as ClientPlannedSession,
  ]);
  queryClient.setQueryData<ClientActivity[]>(queryKeys.activities, [
    {
      id: 'act-1',
      plannedSession: { id: 'ps-1', analysis, analyzedAt },
    } as unknown as ClientActivity,
  ]);
  queryClient.setQueryData(queryKeys.activity('act-1'), {
    id: 'act-1',
    plannedSession: { id: 'ps-1', analysis, analyzedAt },
  });
}

function readClearedCaches(queryClient: QueryClient) {
  const cleared = queryClient.getQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions)?.[0];
  const activity = queryClient.getQueryData<ClientActivity[]>(queryKeys.activities)?.[0];
  const detail = queryClient.getQueryData<{
    plannedSession: { analysis: unknown; analyzedAt: unknown };
  }>(queryKeys.activity('act-1'));
  return { cleared, activity, detail };
}

function expectCachesCleared(queryClient: QueryClient) {
  const { cleared, activity, detail } = readClearedCaches(queryClient);
  expect(cleared?.analysis).toBeNull();
  expect(cleared?.analyzedAt).toBeNull();
  expect(activity?.plannedSession?.analysis).toBeNull();
  expect(detail?.plannedSession?.analysis).toBeNull();
}

function expectCachesRestored(queryClient: QueryClient) {
  const restored = queryClient.getQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions)?.[0];
  expect(restored?.analysis).toEqual(analysis);
  expect(restored?.analyzedAt).toEqual(analyzedAt);
}

describe('beginPlannedSessionReanalysis', () => {
  it('clears analysis so chips can show loading, and rolls back on failure', () => {
    const queryClient = new QueryClient();
    seedCaches(queryClient);

    const previous = beginPlannedSessionReanalysis(queryClient, 'ps-1');
    expect(previous).toEqual({ analysis, analyzedAt });
    expectCachesCleared(queryClient);

    rollbackPlannedSessionReanalysis(queryClient, 'ps-1', previous);
    expectCachesRestored(queryClient);
  });

  it('snapshots analysis from activity detail when the list cache is cold', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.activity('act-1'), {
      id: 'act-1',
      plannedSession: { id: 'ps-1', analysis, analyzedAt },
    });

    const previous = beginPlannedSessionReanalysis(queryClient, 'ps-1');
    expect(previous).toEqual({ analysis, analyzedAt });

    rollbackPlannedSessionReanalysis(queryClient, 'ps-1', previous);
    const detail = queryClient.getQueryData<{
      plannedSession: { analysis: unknown };
    }>(queryKeys.activity('act-1'));
    expect(detail?.plannedSession?.analysis).toEqual(analysis);
  });
});
