import { beforeEach, describe, expect, it, vi } from 'vitest';

const revokeGoogleCredentials = vi.fn();
const refreshAccessToken = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    googleAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    plannedSession: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/integrations/google/google', () => ({
  GoogleOAuthError: class GoogleOAuthError extends Error {
    needsReconnect = false;
  },
  refreshAccessToken: (...args: unknown[]) => refreshAccessToken(...args),
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getFreeBusy: vi.fn(),
  listCalendars: vi.fn(),
  listEvents: vi.fn(),
  updateEvent: vi.fn(),
}));

describe('getValidAccessToken google', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SECRET_ENCRYPTION_KEY = 'google-token-test';
  });

  it('tries refresh when accessTokenEnc fails authenticity and does not wipe refresh', async () => {
    const { prisma } = await import('@/lib/prisma');
    const { encryptSecret } = await import('@/lib/secret-box');
    const { getValidAccessToken } = await import('@/lib/integrations/google/google-sync');

    process.env.SECRET_ENCRYPTION_KEY = 'key-a';
    const refreshEnc = encryptSecret('google-refresh');
    process.env.SECRET_ENCRYPTION_KEY = 'key-b';
    const accessEnc = encryptSecret('stale-access');
    process.env.SECRET_ENCRYPTION_KEY = 'key-a';

    vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue({
      athleteId: 'ath-1',
      accessTokenEnc: accessEnc,
      refreshTokenEnc: refreshEnc,
      expiresAt: new Date(Date.now() + 3600_000),
    } as never);
    vi.mocked(prisma.googleAccount.update).mockResolvedValue({} as never);
    refreshAccessToken.mockResolvedValue({
      access_token: 'fresh-access',
      expires_in: 3600,
    });

    await expect(getValidAccessToken('ath-1')).resolves.toBe('fresh-access');
    expect(refreshAccessToken).toHaveBeenCalledWith('google-refresh');
    expect(prisma.googleAccount.update).toHaveBeenCalled();
    const updateArg = vi.mocked(prisma.googleAccount.update).mock.calls[0]?.[0] as {
      data: { refreshTokenEnc?: string; accessTokenEnc: string };
    };
    expect(updateArg.data.refreshTokenEnc).toBeUndefined();
    expect(updateArg.data.accessTokenEnc).toBeTruthy();
    void revokeGoogleCredentials;
  });
});
