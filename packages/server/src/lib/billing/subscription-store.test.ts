import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Subscription } from '@prisma/client';

vi.mock('server-only', () => ({}));

const findMany = vi.fn();
const updateMany = vi.fn();
const upsert = vi.fn();
vi.mock('@sharpit/db/client', () => ({
  prisma: {
    subscription: {
      findMany: (...a: unknown[]) => findMany(...a),
      upsert: (...a: unknown[]) => upsert(...a),
    },
    athleteProfile: { updateMany: (...a: unknown[]) => updateMany(...a) },
  },
}));

function row(overrides: Partial<Subscription>): Subscription {
  return {
    id: 'sub',
    athleteId: 'athlete-1',
    source: 'apple',
    productId: 'app.sharpit.pro.monthly',
    originalTransactionId: '1000',
    status: 'active',
    expiresAt: new Date('2026-10-24T00:00:00.000Z'),
    willRenew: true,
    environment: 'Production',
    appAccountToken: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-24T00:00:00.000Z'),
    ...overrides,
  };
}

describe('subscription store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMany.mockResolvedValue({ count: 1 });
  });

  it('derives Pro from any entitlement granting it', async () => {
    findMany.mockResolvedValue([
      { status: 'expired', expiresAt: null },
      { status: 'active', expiresAt: new Date('2026-10-24T00:00:00.000Z') },
    ]);
    const { recomputeAthleteTier } = await import('./subscription-store');
    await expect(
      recomputeAthleteTier('athlete-1', new Date('2026-09-24T00:00:00.000Z')),
    ).resolves.toBe('PRO');
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'athlete-1', NOT: { tier: 'PRO' } },
      data: { tier: 'PRO' },
    });
  });

  it('falls back to Free when nothing grants Pro', async () => {
    findMany.mockResolvedValue([{ status: 'billing_retry', expiresAt: null }]);
    const { recomputeAthleteTier } = await import('./subscription-store');
    await expect(recomputeAthleteTier('athlete-1')).resolves.toBe('FREE');
  });

  it('turns the /admin toggle into a manual entitlement', async () => {
    upsert.mockResolvedValue({});
    findMany.mockResolvedValue([]);
    const { setManualTier } = await import('./subscription-store');
    await setManualTier('athlete-1', 'FREE');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'manual_athlete-1' },
        update: { status: 'expired' },
      }),
    );
  });

  it('shows the entitlement granting access, hiding a manual one switched off', async () => {
    const { pickDisplayedSubscription } = await import('./subscription-store');
    const apple = row({ id: 'apple', status: 'expired' });
    const manualOff = row({
      id: 'manual',
      source: 'manual',
      status: 'expired',
      updatedAt: new Date(),
    });
    expect(pickDisplayedSubscription([manualOff, apple])?.id).toBe('apple');
    expect(pickDisplayedSubscription([manualOff])).toBeNull();
    expect(pickDisplayedSubscription([apple, row({ id: 'live' })])?.id).toBe('live');
  });

  it('projects renewsAt only for a subscription that will renew', async () => {
    const { toV1ProSubscription } = await import('./subscription-store');
    expect(toV1ProSubscription(row({}))).toEqual({
      status: 'active',
      source: 'apple',
      renewsAt: '2026-10-24T00:00:00.000Z',
      expiresAt: '2026-10-24T00:00:00.000Z',
      willRenew: true,
    });
    expect(toV1ProSubscription(row({ willRenew: false })).renewsAt).toBeNull();
  });
});
