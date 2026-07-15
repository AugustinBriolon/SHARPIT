import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/queries', () => ({
  getPlannedSessionById: vi.fn(),
  updatePlannedSession: vi.fn(),
  deletePlannedSession: vi.fn(),
}));

vi.mock('@/lib/integrations/google-sync', () => ({
  pushSessionToGoogle: vi.fn().mockResolvedValue(undefined),
  deleteSessionFromGoogle: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/planned-session/resolve-context', () => ({
  refreshAndPersistPlannedSessionContext: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/decision-memory/repository', () => ({
  recordDecisionAction: vi.fn().mockResolvedValue({ id: 'action-1' }),
  findDecisionForPlannedSession: vi.fn().mockResolvedValue(null),
  findCoachingDecisionById: vi.fn().mockResolvedValue(null),
}));

async function importRoute() {
  return await import('./route');
}

const EXISTING = {
  id: 'session-1',
  type: 'RUN',
  intensity: 'ENDURANCE',
  durationMin: 45,
  load: 40,
  date: new Date('2026-07-20T12:00:00.000Z'),
};

function patchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/planned-sessions/session-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/planned-sessions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records ACCEPTED when decisionId is given (athlete applying an adapt proposal)', async () => {
    const { getPlannedSessionById, updatePlannedSession } = await import('@/lib/queries');
    const { recordDecisionAction, findDecisionForPlannedSession } =
      await import('@/lib/decision-memory/repository');
    vi.mocked(getPlannedSessionById).mockResolvedValue(EXISTING as never);
    vi.mocked(updatePlannedSession).mockResolvedValue({ ...EXISTING, load: 20 } as never);

    const { PATCH } = await importRoute();
    const response = await PATCH(patchRequest({ load: 20, decisionId: 'decision-1' }), {
      params: Promise.resolve({ id: 'session-1' }),
    });

    expect(response.status).toBe(200);
    expect(recordDecisionAction).toHaveBeenCalledWith({
      decisionId: 'decision-1',
      actionType: 'ACCEPTED',
      source: 'PLAN_REVIEW_UI',
      resultingPlannedSessionId: 'session-1',
    });
    expect(findDecisionForPlannedSession).not.toHaveBeenCalled();
  });

  it('rejects the write with 422 and never updates the session when the decision was Gate-REJECTED', async () => {
    const { updatePlannedSession, getPlannedSessionById } = await import('@/lib/queries');
    const { findCoachingDecisionById, recordDecisionAction } =
      await import('@/lib/decision-memory/repository');
    vi.mocked(getPlannedSessionById).mockResolvedValue(EXISTING as never);
    vi.mocked(findCoachingDecisionById).mockResolvedValueOnce({
      id: 'decision-1',
      gateResult: { status: 'REJECTED' },
    } as never);

    const { PATCH } = await importRoute();
    const response = await PATCH(patchRequest({ load: 20, decisionId: 'decision-1' }), {
      params: Promise.resolve({ id: 'session-1' }),
    });

    expect(response.status).toBe(422);
    expect(updatePlannedSession).not.toHaveBeenCalled();
    expect(recordDecisionAction).not.toHaveBeenCalled();
  });

  it('records OVERRIDDEN when a session-defining field changes without decisionId and a prior decision exists', async () => {
    const { getPlannedSessionById, updatePlannedSession } = await import('@/lib/queries');
    const { recordDecisionAction, findDecisionForPlannedSession } =
      await import('@/lib/decision-memory/repository');
    vi.mocked(getPlannedSessionById).mockResolvedValue(EXISTING as never);
    vi.mocked(updatePlannedSession).mockResolvedValue({ ...EXISTING, load: 70 } as never);
    vi.mocked(findDecisionForPlannedSession).mockResolvedValue({ id: 'decision-2' } as never);

    const { PATCH } = await importRoute();
    const response = await PATCH(patchRequest({ load: 70 }), {
      params: Promise.resolve({ id: 'session-1' }),
    });

    expect(response.status).toBe(200);
    expect(findDecisionForPlannedSession).toHaveBeenCalledWith('session-1');
    expect(recordDecisionAction).toHaveBeenCalledWith({
      decisionId: 'decision-2',
      actionType: 'OVERRIDDEN',
      source: 'CALENDAR_EDIT',
      resultingPlannedSessionId: 'session-1',
    });
  });

  it('does not look up a decision when the edit touches no session-defining field', async () => {
    const { getPlannedSessionById, updatePlannedSession } = await import('@/lib/queries');
    const { recordDecisionAction, findDecisionForPlannedSession } =
      await import('@/lib/decision-memory/repository');
    vi.mocked(getPlannedSessionById).mockResolvedValue(EXISTING as never);
    vi.mocked(updatePlannedSession).mockResolvedValue({ ...EXISTING, title: 'Renamed' } as never);

    const { PATCH } = await importRoute();
    const response = await PATCH(patchRequest({ title: 'Renamed' }), {
      params: Promise.resolve({ id: 'session-1' }),
    });

    expect(response.status).toBe(200);
    expect(findDecisionForPlannedSession).not.toHaveBeenCalled();
    expect(recordDecisionAction).not.toHaveBeenCalled();
  });

  it('does not record OVERRIDDEN when the session never came from a coaching decision', async () => {
    const { getPlannedSessionById, updatePlannedSession } = await import('@/lib/queries');
    const { recordDecisionAction, findDecisionForPlannedSession } =
      await import('@/lib/decision-memory/repository');
    vi.mocked(getPlannedSessionById).mockResolvedValue(EXISTING as never);
    vi.mocked(updatePlannedSession).mockResolvedValue({ ...EXISTING, load: 70 } as never);
    vi.mocked(findDecisionForPlannedSession).mockResolvedValue(null);

    const { PATCH } = await importRoute();
    const response = await PATCH(patchRequest({ load: 70 }), {
      params: Promise.resolve({ id: 'session-1' }),
    });

    expect(response.status).toBe(200);
    expect(findDecisionForPlannedSession).toHaveBeenCalledWith('session-1');
    expect(recordDecisionAction).not.toHaveBeenCalled();
  });
});
