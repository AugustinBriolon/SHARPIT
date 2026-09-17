import { describe, expect, it, vi } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';
import {
  invalidateAfterCoachToolApproval,
  invalidateAfterCoachTools,
  invalidatePlannedSessionsAfterCoachTurn,
} from '@/lib/coach/chat/shell/coach-chat-cache';
import { queryKeys } from '@/lib/query/keys';

function mockQueryClient() {
  return {
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient & { invalidateQueries: ReturnType<typeof vi.fn> };
}

function expectTodayAndPlanInvalidated(
  queryClient: QueryClient & { invalidateQueries: ReturnType<typeof vi.fn> },
) {
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: queryKeys.presentationTodayAll,
  });
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: ['today'],
  });
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: queryKeys.trainingPlan,
  });
}

describe('invalidateAfterCoachTools', () => {
  it('invalidates planned sessions, Today/Plan, travel, and coach memory', () => {
    const queryClient = mockQueryClient();
    invalidateAfterCoachTools(queryClient);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.plannedSessions,
    });
    expectTodayAndPlanInvalidated(queryClient);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.travelContext,
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.coachMemory,
    });
  });
});

describe('invalidatePlannedSessionsAfterCoachTurn', () => {
  it('invalidates planned sessions and Today/Plan', () => {
    const queryClient = mockQueryClient();
    invalidatePlannedSessionsAfterCoachTurn(queryClient);
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(4);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.plannedSessions,
    });
    expectTodayAndPlanInvalidated(queryClient);
  });
});

describe('invalidateAfterCoachToolApproval', () => {
  it('always invalidates planned sessions and Today/Plan', () => {
    const queryClient = mockQueryClient();
    invalidateAfterCoachToolApproval(queryClient, 'tool-createPlannedSession');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.plannedSessions,
    });
    expectTodayAndPlanInvalidated(queryClient);
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(4);
  });

  it('also invalidates travel and memory for travel tools', () => {
    const queryClient = mockQueryClient();
    invalidateAfterCoachToolApproval(queryClient, 'tool-setTravelContext');
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(6);
  });
});
