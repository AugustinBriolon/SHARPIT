import { describe, expect, it, vi, beforeEach } from 'vitest';

const findUniqueMock = vi.fn();
const aggregateMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    athleteProfile: { findUnique: (...args: unknown[]) => findUniqueMock(...args) },
    aiUsageEvent: { aggregate: (...args: unknown[]) => aggregateMock(...args) },
  },
}));

async function importModule() {
  return await import('./ai-budget');
}

describe('ensureFreeAiBudget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is always allowed for Pro athletes, without checking usage', async () => {
    findUniqueMock.mockResolvedValue({ tier: 'PRO' });
    const { ensureFreeAiBudget } = await importModule();

    const status = await ensureFreeAiBudget('athlete-1');

    expect(status).toEqual({ allowed: true, isPro: true, warning: false });
    expect(aggregateMock).not.toHaveBeenCalled();
  });

  it('allows a FREE athlete under today’s token budget', async () => {
    findUniqueMock.mockResolvedValue({ tier: 'FREE' });
    aggregateMock.mockResolvedValue({ _sum: { totalTokens: 10_000 } });
    const { ensureFreeAiBudget } = await importModule();

    const status = await ensureFreeAiBudget('athlete-1');

    expect(status).toEqual({ allowed: true, isPro: false, warning: false });
  });

  it('blocks a FREE athlete once today’s token budget is spent', async () => {
    findUniqueMock.mockResolvedValue({ tier: 'FREE' });
    aggregateMock.mockResolvedValue({ _sum: { totalTokens: 150_000 } });
    const { ensureFreeAiBudget } = await importModule();

    const status = await ensureFreeAiBudget('athlete-1');

    expect(status).toEqual({ allowed: false, isPro: false, warning: false });
  });

  it('treats a missing profile as FREE with no usage yet', async () => {
    findUniqueMock.mockResolvedValue(null);
    aggregateMock.mockResolvedValue({ _sum: { totalTokens: null } });
    const { ensureFreeAiBudget } = await importModule();

    const status = await ensureFreeAiBudget('athlete-1');

    expect(status).toEqual({ allowed: true, isPro: false, warning: false });
  });

  it('warns a FREE athlete who is still allowed but close to today’s budget', async () => {
    findUniqueMock.mockResolvedValue({ tier: 'FREE' });
    aggregateMock.mockResolvedValue({ _sum: { totalTokens: 42_000 } });
    const { ensureFreeAiBudget } = await importModule();

    const status = await ensureFreeAiBudget('athlete-1');

    expect(status).toEqual({ allowed: true, isPro: false, warning: true });
  });

  it('never warns a Pro athlete, even at high usage', async () => {
    findUniqueMock.mockResolvedValue({ tier: 'PRO' });
    const { ensureFreeAiBudget } = await importModule();

    const status = await ensureFreeAiBudget('athlete-1');

    expect(status.warning).toBe(false);
  });

  it('only sums coach usage — narrative analysis has its own separate gate and must not count here', async () => {
    findUniqueMock.mockResolvedValue({ tier: 'FREE' });
    aggregateMock.mockResolvedValue({ _sum: { totalTokens: 1_000 } });
    const { ensureFreeAiBudget } = await importModule();

    await ensureFreeAiBudget('athlete-1');

    expect(aggregateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ feature: 'coach' }),
      }),
    );
  });
});
