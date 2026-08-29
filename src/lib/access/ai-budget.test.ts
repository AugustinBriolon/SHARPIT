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

    expect(status).toEqual({ allowed: true, isPro: true });
    expect(aggregateMock).not.toHaveBeenCalled();
  });

  it('allows a FREE athlete under today’s token budget', async () => {
    findUniqueMock.mockResolvedValue({ tier: 'FREE' });
    aggregateMock.mockResolvedValue({ _sum: { totalTokens: 10_000 } });
    const { ensureFreeAiBudget } = await importModule();

    const status = await ensureFreeAiBudget('athlete-1');

    expect(status).toEqual({ allowed: true, isPro: false });
  });

  it('blocks a FREE athlete once today’s token budget is spent', async () => {
    findUniqueMock.mockResolvedValue({ tier: 'FREE' });
    aggregateMock.mockResolvedValue({ _sum: { totalTokens: 150_000 } });
    const { ensureFreeAiBudget } = await importModule();

    const status = await ensureFreeAiBudget('athlete-1');

    expect(status).toEqual({ allowed: false, isPro: false });
  });

  it('treats a missing profile as FREE with no usage yet', async () => {
    findUniqueMock.mockResolvedValue(null);
    aggregateMock.mockResolvedValue({ _sum: { totalTokens: null } });
    const { ensureFreeAiBudget } = await importModule();

    const status = await ensureFreeAiBudget('athlete-1');

    expect(status).toEqual({ allowed: true, isPro: false });
  });
});
