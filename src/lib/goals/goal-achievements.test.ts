import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRecentGoalAchievements } from '@/lib/goals/goal-achievements';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    goalAchievement: {
      findMany: vi.fn(),
    },
  },
}));

describe('getRecentGoalAchievements', () => {
  beforeEach(() => {
    vi.mocked(prisma.goalAchievement.findMany).mockResolvedValue([]);
  });

  it('scopes achievements to the current athlete', async () => {
    await getRecentGoalAchievements('athlete-demo', 15);

    expect(prisma.goalAchievement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { goal: { athleteId: 'athlete-demo' } },
        take: 15,
      }),
    );
  });
});
