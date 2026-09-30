import { describe, expect, it, vi } from 'vitest';

const tx = vi.hoisted(() => ({
  plannedSession: {
    findMany: vi.fn(),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: object }) => ({
      id: where.id,
      ...data,
    })),
  },
}));
vi.mock('@sharpit/db/client', () => ({
  prisma: { $transaction: async (work: (client: typeof tx) => unknown) => work(tx) },
}));

const { rescheduleBrickSessions } = await import('@sharpit/server/lib/queries/planned-sessions');

describe('rescheduleBrickSessions', () => {
  const legs = [
    { id: 'bike', durationMin: 85, brickOrder: 0 },
    { id: 'run', durationMin: 30, brickOrder: 1 },
  ];

  it('puts every leg on the new day, chained from the new start', async () => {
    tx.plannedSession.findMany.mockResolvedValue(legs);
    const day = new Date('2026-09-30T12:00:00');

    const moved = await rescheduleBrickSessions('athlete-1', 'group-1', {
      date: day,
      startTime: '12:00',
    });

    expect(tx.plannedSession.findMany).toHaveBeenCalledWith({
      where: { athleteId: 'athlete-1', brickGroupId: 'group-1' },
      orderBy: { brickOrder: 'asc' },
    });
    expect(moved).toEqual([
      { id: 'bike', date: day, startTime: '12:00' },
      { id: 'run', date: day, startTime: '13:25' },
    ]);
  });

  it('keeps each leg’s time when only the day changes', async () => {
    tx.plannedSession.findMany.mockResolvedValue(legs);
    const day = new Date('2026-10-02T12:00:00');

    const moved = await rescheduleBrickSessions('athlete-1', 'group-1', { date: day });

    expect(moved).toEqual([
      { id: 'bike', date: day },
      { id: 'run', date: day },
    ]);
  });
});
