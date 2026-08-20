import { describe, expect, it, vi } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';
import {
  invalidateAfterCoachToolApproval,
  invalidateAfterCoachTools,
  invalidatePlannedSessionsAfterCoachTurn,
} from '@/lib/coach/chat/coach-chat-cache';
import { queryKeys } from '@/lib/query/keys';

function mockQueryClient() {
  return {
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient & { invalidateQueries: ReturnType<typeof vi.fn> };
}

describe('invalidateAfterCoachTools', () => {
  it('invalidates planned sessions, travel, and coach memory', () => {
    const queryClient = mockQueryClient();
    invalidateAfterCoachTools(queryClient);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.plannedSessions,
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.travelContext,
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.coachMemory,
    });
  });
});

describe('invalidatePlannedSessionsAfterCoachTurn', () => {
  it('invalidates planned sessions only', () => {
    const queryClient = mockQueryClient();
    invalidatePlannedSessionsAfterCoachTurn(queryClient);
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.plannedSessions,
    });
  });
});

describe('invalidateAfterCoachToolApproval', () => {
  it('always invalidates planned sessions', () => {
    const queryClient = mockQueryClient();
    invalidateAfterCoachToolApproval(queryClient, 'tool-createPlannedSession');
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.plannedSessions,
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('also invalidates travel and memory for travel tools', () => {
    const queryClient = mockQueryClient();
    invalidateAfterCoachToolApproval(queryClient, 'tool-setTravelContext');
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3);
  });
});
