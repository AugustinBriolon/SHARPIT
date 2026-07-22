import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    plannedSession: {
      findFirst: vi.fn(),
    },
    activity: {
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/queries/planned-sessions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries/planned-sessions')>();
  return {
    ...actual,
    linkPlannedSessionActivity: vi.fn(),
  };
});

vi.mock('@/lib/integrations/garmin', () => ({
  clientFromTokens: vi.fn(),
  garminTokensFromStorage: vi.fn(),
}));

vi.mock('@/lib/integrations/garmin-multisport', () => ({
  fetchGarminMultisportLegs: vi.fn(),
}));

vi.mock('@/lib/integrations/garmin-sync', () => ({
  getGarminAccount: vi.fn(),
}));

describe('deleteActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unlinks the planned session before deleting the activity', async () => {
    const { prisma } = await import('@/lib/prisma');
    const { linkPlannedSessionActivity } = await import('@/lib/queries/planned-sessions');
    const { deleteActivity } = await import('@/lib/queries/index');

    vi.mocked(prisma.plannedSession.findFirst).mockResolvedValue({ id: 'ps-1' } as never);
    vi.mocked(linkPlannedSessionActivity).mockResolvedValue({} as never);
    vi.mocked(prisma.activity.delete).mockResolvedValue({ id: 'act-1' } as never);

    await deleteActivity('act-1');

    expect(prisma.plannedSession.findFirst).toHaveBeenCalledWith({
      where: { activityId: 'act-1' },
      select: { id: true },
    });
    expect(linkPlannedSessionActivity).toHaveBeenCalledWith('ps-1', null);
    expect(prisma.activity.delete).toHaveBeenCalledWith({ where: { id: 'act-1' } });
  });

  it('deletes the activity without unlink when nothing is linked', async () => {
    const { prisma } = await import('@/lib/prisma');
    const { linkPlannedSessionActivity } = await import('@/lib/queries/planned-sessions');
    const { deleteActivity } = await import('@/lib/queries/index');

    vi.mocked(prisma.plannedSession.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.activity.delete).mockResolvedValue({ id: 'act-2' } as never);

    await deleteActivity('act-2');

    expect(linkPlannedSessionActivity).not.toHaveBeenCalled();
    expect(prisma.activity.delete).toHaveBeenCalledWith({ where: { id: 'act-2' } });
  });
});
