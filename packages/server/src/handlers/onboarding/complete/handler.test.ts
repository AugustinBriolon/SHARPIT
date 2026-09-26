import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@sharpit/db/client', () => ({
  prisma: {
    athleteProfile: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@sharpit/server/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn(async () => 'athlete_1'),
}));

import { POST } from '@sharpit/server/handlers/onboarding/complete/handler';
import { prisma } from '@sharpit/db/client';

describe('POST /api/onboarding/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks onboarding complete for the current athlete', async () => {
    vi.mocked(prisma.athleteProfile.update).mockResolvedValue({} as never);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(prisma.athleteProfile.update).toHaveBeenCalledWith({
      where: { id: 'athlete_1' },
      data: { onboardingCompletedAt: expect.any(Date) },
    });
  });
});
