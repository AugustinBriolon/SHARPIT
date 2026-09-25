import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptSecret, isSecretAuthenticityFailure } from '@/lib/secret-box';
import { resolveOAuthAccessToken } from '@/lib/integrations/shared/oauth-access-token';

describe('resolveOAuthAccessToken', () => {
  beforeEach(() => {
    process.env.SECRET_ENCRYPTION_KEY = 'oauth-access-token-test';
  });

  it('falls back to refresh when access decrypt fails authenticity, without revoking', async () => {
    process.env.SECRET_ENCRYPTION_KEY = 'key-a';
    const refreshOnly = encryptSecret('refresh-ok');
    process.env.SECRET_ENCRYPTION_KEY = 'key-wrong-for-access';
    const accessWrong = encryptSecret('access');
    process.env.SECRET_ENCRYPTION_KEY = 'key-a';

    const revoke = vi.fn();
    const refresh = vi.fn().mockResolvedValue({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    });
    const persist = vi.fn();

    const token = await resolveOAuthAccessToken({
      athleteId: 'ath-1',
      account: {
        accessTokenEnc: accessWrong,
        refreshTokenEnc: refreshOnly,
        expiresAt: new Date(Date.now() + 3600_000),
      },
      revoke,
      refresh,
      persist,
      reconnectMessage: 'reconnect',
      extractAccessToken: (r) => r.access_token,
    });

    expect(token).toBe('new-access');
    expect(refresh).toHaveBeenCalledWith('refresh-ok');
    expect(revoke).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalled();
  });

  it('does not revoke when refresh token fails authenticity (wrong key)', async () => {
    process.env.SECRET_ENCRYPTION_KEY = 'key-a';
    const blob = encryptSecret('refresh');
    process.env.SECRET_ENCRYPTION_KEY = 'key-b';

    const revoke = vi.fn();

    await expect(
      resolveOAuthAccessToken({
        athleteId: 'ath-1',
        account: {
          accessTokenEnc: blob,
          refreshTokenEnc: blob,
          expiresAt: new Date(Date.now() + 3600_000),
        },
        revoke,
        refresh: vi.fn(),
        persist: vi.fn(),
        reconnectMessage: 'reconnect',
        extractAccessToken: () => 'x',
      }),
    ).rejects.toSatisfy(isSecretAuthenticityFailure);

    expect(revoke).not.toHaveBeenCalled();
  });
});
