import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateMock = vi.fn();
const updateManyMock = vi.fn();
const transactionMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => transactionMock(...args),
    athleteProfile: {
      update: (...args: unknown[]) => updateMock(...args),
    },
    garminAccount: { updateMany: (...args: unknown[]) => updateManyMock(...args) },
    stravaAccount: { updateMany: (...args: unknown[]) => updateManyMock(...args) },
    googleAccount: { updateMany: (...args: unknown[]) => updateManyMock(...args) },
    withingsAccount: { updateMany: (...args: unknown[]) => updateManyMock(...args) },
    renphoAccount: { updateMany: (...args: unknown[]) => updateManyMock(...args) },
    myFitnessPalAccount: { updateMany: (...args: unknown[]) => updateManyMock(...args) },
  },
}));

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(),
}));

describe('softDeleteAthlete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockResolvedValue([]);
    updateMock.mockResolvedValue({
      id: 'athlete-1',
      deletedAt: new Date('2026-09-02T08:00:00.000Z'),
    });
  });

  it('stamps deletedAt and clears Enc credentials immediately', async () => {
    const { softDeleteAthlete } = await import('./account-deletion');
    const result = await softDeleteAthlete('athlete-1', new Date('2026-09-02T08:00:00.000Z'));

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'athlete-1' },
      data: { deletedAt: new Date('2026-09-02T08:00:00.000Z') },
      select: { id: true, deletedAt: true },
    });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    const batch = transactionMock.mock.calls[0]?.[0] as unknown[];
    expect(batch).toHaveLength(6);
    expect(result.athleteId).toBe('athlete-1');
    expect(result.purgeAfter.toISOString()).toBe('2026-10-02T08:00:00.000Z');
  });
});
