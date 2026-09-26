import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sharpit/db/client', () => ({
  prisma: {
    plannedSession: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    brickAnalysis: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('deletePlannedSession brick demotion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears brick metadata on the surviving leg and drops brick analysis', async () => {
    const { prisma } = await import('@sharpit/db/client');
    const { deletePlannedSession } = await import('@/lib/queries/planned-sessions');

    vi.mocked(prisma.plannedSession.findFirst).mockResolvedValue({
      id: 'bike',
      brickGroupId: 'brick-1',
    } as never);
    vi.mocked(prisma.plannedSession.delete).mockResolvedValue({ id: 'bike' } as never);
    vi.mocked(prisma.plannedSession.findMany).mockResolvedValue([{ id: 'run' }] as never);
    vi.mocked(prisma.plannedSession.update).mockResolvedValue({ id: 'run' } as never);
    vi.mocked(prisma.brickAnalysis.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(prisma as never));

    await deletePlannedSession('athlete-1', 'bike');

    expect(prisma.plannedSession.update).toHaveBeenCalledWith({
      where: { id: 'run' },
      data: { brickGroupId: null, brickOrder: null },
    });
    expect(prisma.brickAnalysis.deleteMany).toHaveBeenCalledWith({
      where: { brickGroupId: 'brick-1', athleteId: 'athlete-1' },
    });
  });

  it('does not demote when two or more legs remain', async () => {
    const { prisma } = await import('@sharpit/db/client');
    const { deletePlannedSession } = await import('@/lib/queries/planned-sessions');

    vi.mocked(prisma.plannedSession.findFirst).mockResolvedValue({
      id: 'swim',
      brickGroupId: 'brick-1',
    } as never);
    vi.mocked(prisma.plannedSession.delete).mockResolvedValue({ id: 'swim' } as never);
    vi.mocked(prisma.plannedSession.findMany).mockResolvedValue([
      { id: 'bike' },
      { id: 'run' },
    ] as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(prisma as never));

    await deletePlannedSession('athlete-1', 'swim');

    expect(prisma.plannedSession.update).not.toHaveBeenCalled();
    expect(prisma.brickAnalysis.deleteMany).not.toHaveBeenCalled();
  });

  it('skips brick logic when deleting a simple session', async () => {
    const { prisma } = await import('@sharpit/db/client');
    const { deletePlannedSession } = await import('@/lib/queries/planned-sessions');

    vi.mocked(prisma.plannedSession.findFirst).mockResolvedValue({
      id: 'solo',
      brickGroupId: null,
    } as never);
    vi.mocked(prisma.plannedSession.delete).mockResolvedValue({ id: 'solo' } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(prisma as never));

    await deletePlannedSession('athlete-1', 'solo');

    expect(prisma.plannedSession.findMany).not.toHaveBeenCalled();
    expect(prisma.plannedSession.update).not.toHaveBeenCalled();
    expect(prisma.brickAnalysis.deleteMany).not.toHaveBeenCalled();
  });
});
