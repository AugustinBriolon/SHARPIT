import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@sharpit/server/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));
const isProAthlete = vi.fn();
vi.mock('@sharpit/server/lib/access/is-pro-athlete', () => ({ isProAthlete }));
const findFirst = vi.fn();
vi.mock('@sharpit/db/client', () => ({ prisma: { plannedSession: { findFirst } } }));
const pushEndurance = vi.fn();
vi.mock('@sharpit/server/lib/integrations/garmin/garmin-endurance-workout', () => ({
  pushEnduranceWorkoutFromPlannedSession: pushEndurance,
}));
vi.mock('@sharpit/server/lib/integrations/garmin/garmin-strength-workout', () => ({
  pushStrengthWorkoutFromPlannedSession: vi.fn(),
}));

const request = () =>
  new NextRequest('https://api.sharpit.app/api/v1/garmin/workouts/from-planned-session', {
    method: 'POST',
    body: JSON.stringify({ plannedSessionId: 'ps-1' }),
  });

describe('POST /api/garmin/workouts/from-planned-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirst.mockResolvedValue({ type: 'RUN' });
    pushEndurance.mockResolvedValue({ ok: true });
  });

  it('keeps sending to the watch for SharpIt Pro', async () => {
    const { POST } = await import('./handler');
    isProAthlete.mockResolvedValue(false);
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'pro_required' });
    expect(pushEndurance).not.toHaveBeenCalled();
  });

  it('sends for a Pro athlete', async () => {
    const { POST } = await import('./handler');
    isProAthlete.mockResolvedValue(true);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(pushEndurance).toHaveBeenCalled();
  });
});
