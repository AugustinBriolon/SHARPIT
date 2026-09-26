import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
const verifier = vi.hoisted(() => ({
  verifyAppleNotification: vi.fn(),
  verifyAppleTransaction: vi.fn(),
  verifyAppleRenewalInfo: vi.fn(),
}));
vi.mock('@sharpit/server/lib/billing/apple-verifier', () => verifier);
const sync = vi.hoisted(() => {
  class AppleOwnershipError extends Error {}
  return {
    AppleOwnershipError,
    applyAppleTransaction: vi.fn(),
    athleteForAppleTransaction: vi.fn(),
    statusFromAppleNotification: (type: string, status?: number) =>
      type === 'REFUND' ? 'revoked' : status === 1 ? 'active' : null,
  };
});
vi.mock('@sharpit/server/lib/billing/apple-sync', () => sync);

const post = (body: unknown) =>
  new NextRequest('https://sharpit.app/api/billing/apple/notifications', {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('POST /api/billing/apple/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  it('refuses a payload whose signature does not verify', async () => {
    verifier.verifyAppleNotification.mockRejectedValue(new Error('forged'));
    const { POST } = await import('./handler');
    expect((await POST(post({ signedPayload: 'x.y.z' }))).status).toBe(400);
  });

  it('acknowledges a TEST notification without touching anything', async () => {
    verifier.verifyAppleNotification.mockResolvedValue({ notificationType: 'TEST' });
    const { POST } = await import('./handler');
    const response = await POST(post({ signedPayload: 'x.y.z' }));
    expect(response.status).toBe(200);
    expect(sync.applyAppleTransaction).not.toHaveBeenCalled();
  });

  it('acknowledges a transaction that is not tied to any account', async () => {
    verifier.verifyAppleNotification.mockResolvedValue({
      notificationType: 'DID_RENEW',
      data: { signedTransactionInfo: 't', status: 1 },
    });
    verifier.verifyAppleTransaction.mockResolvedValue({ originalTransactionId: '1' });
    sync.athleteForAppleTransaction.mockResolvedValue(null);
    const { POST } = await import('./handler');
    expect(await (await POST(post({ signedPayload: 'x.y.z' }))).json()).toEqual({
      ok: true,
      handled: false,
    });
  });

  it('applies a refund to its owner as a revocation', async () => {
    verifier.verifyAppleNotification.mockResolvedValue({
      notificationType: 'REFUND',
      data: { signedTransactionInfo: 't', signedRenewalInfo: 'r', status: 1 },
    });
    verifier.verifyAppleTransaction.mockResolvedValue({ originalTransactionId: '1' });
    verifier.verifyAppleRenewalInfo.mockResolvedValue({ autoRenewStatus: 0 });
    sync.athleteForAppleTransaction.mockResolvedValue({
      athleteId: 'athlete-1',
      appAccountToken: 'token-a',
    });
    const { POST } = await import('./handler');

    const response = await POST(post({ signedPayload: 'x.y.z' }));
    expect(response.status).toBe(200);
    expect(sync.applyAppleTransaction).toHaveBeenCalledWith({
      athleteId: 'athlete-1',
      athleteAppAccountToken: 'token-a',
      transaction: { originalTransactionId: '1' },
      renewal: { autoRenewStatus: 0 },
      statusOverride: 'revoked',
    });
  });
});
