import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    athleteProfile: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn(async () => 'athlete_1'),
}));

import { POST } from '@/app/api/onboarding/complete/route';
import { prisma } from '@/lib/prisma';

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
