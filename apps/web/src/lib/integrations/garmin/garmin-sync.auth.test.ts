import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GarminTokens } from '@/lib/integrations/garmin/garmin';

const refreshDiGarminTokens = vi.fn();
const clientFromTokens = vi.fn((tokens: GarminTokens) => ({ __client: true, tokens }));
const loginWithCredentials = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    garminAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    athleteProfile: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/integrations/garmin/garmin', async () => {
  const actual = await vi.importActual<typeof import('@/lib/integrations/garmin/garmin')>(
    '@/lib/integrations/garmin/garmin',
  );
  return {
    ...actual,
    refreshDiGarminTokens: (...args: unknown[]) => refreshDiGarminTokens(...args),
    clientFromTokens: (...args: unknown[]) => clientFromTokens(...(args as [GarminTokens])),
    loginWithCredentials: (...args: unknown[]) => loginWithCredentials(...args),
  };
});

function diTokens(expiresAtSec: number): GarminTokens {
  return {
    oauth1: {
      oauth_token: '__DI__:GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2',
      oauth_token_secret: 'rt-stored',
    },
    oauth2: {
      scope: '',
      jti: '',
      access_token: 'access-old',
      token_type: 'Bearer',
      refresh_token: 'rt-stored',
      expires_in: 60,
      refresh_token_expires_in: 0,
      expires_at: expiresAtSec,
      refresh_token_expires_at: 0,
      last_update_date: new Date().toISOString(),
      expires_date: new Date(expiresAtSec * 1000).toISOString(),
    },
  };
}

describe('buildFreshGarminClient auth hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SECRET_ENCRYPTION_KEY = 'garmin-sync-auth-test';
    loginWithCredentials.mockReset();
    refreshDiGarminTokens.mockReset();
    clientFromTokens.mockImplementation((tokens: GarminTokens) => ({ __client: true, tokens }));
  });

  it('refreshes near-expiry DI tokens and never calls SSO login', async () => {
    const { prisma } = await import('@/lib/prisma');
    const { encryptGarminToken, buildFreshGarminClient } =
      await import('@/lib/integrations/garmin/garmin-sync');

    const nearExpiry = Math.floor(Date.now() / 1000) + 60; // within 5 min margin
    const stored = diTokens(nearExpiry);
    const refreshed = diTokens(Math.floor(Date.now() / 1000) + 3600);
    refreshed.oauth2.access_token = 'access-new';

    refreshDiGarminTokens.mockResolvedValue(refreshed);
    vi.mocked(prisma.garminAccount.update).mockResolvedValue({} as never);

    const client = await buildFreshGarminClient('ath-1', {
      oauth1TokenEnc: encryptGarminToken(stored.oauth1),
      oauth2TokenEnc: encryptGarminToken(stored.oauth2),
    });

    expect(refreshDiGarminTokens).toHaveBeenCalledTimes(1);
    expect(loginWithCredentials).not.toHaveBeenCalled();
    expect(prisma.garminAccount.update).toHaveBeenCalled();
    expect(client).toMatchObject({ __client: true });
    expect(clientFromTokens).toHaveBeenCalledWith(refreshed);
  });

  it('revokes credentials when DI refresh fails (needs reconnect), without SSO', async () => {
    const { prisma } = await import('@/lib/prisma');
    const { encryptGarminToken, buildFreshGarminClient } =
      await import('@/lib/integrations/garmin/garmin-sync');
    const { ProviderAuthError } = await import('@/lib/integrations/shared/connection-status');

    const nearExpiry = Math.floor(Date.now() / 1000) + 30;
    const stored = diTokens(nearExpiry);
    refreshDiGarminTokens.mockRejectedValue(new Error('refresh dead'));
    vi.mocked(prisma.garminAccount.findUnique).mockResolvedValue({
      athleteId: 'ath-1',
      oauth1TokenEnc: 'x',
      oauth2TokenEnc: 'y',
    } as never);
    vi.mocked(prisma.garminAccount.update).mockResolvedValue({} as never);

    await expect(
      buildFreshGarminClient('ath-1', {
        oauth1TokenEnc: encryptGarminToken(stored.oauth1),
        oauth2TokenEnc: encryptGarminToken(stored.oauth2),
      }),
    ).rejects.toBeInstanceOf(ProviderAuthError);

    expect(loginWithCredentials).not.toHaveBeenCalled();
    expect(prisma.garminAccount.update).toHaveBeenCalledWith({
      where: { athleteId: 'ath-1' },
      data: { oauth1TokenEnc: '', oauth2TokenEnc: '' },
    });
  });

  it('never calls loginWithCredentials for expired legacy Garth tokens', async () => {
    const { prisma } = await import('@/lib/prisma');
    const { encryptGarminToken, buildFreshGarminClient } =
      await import('@/lib/integrations/garmin/garmin-sync');
    const { ProviderAuthError } = await import('@/lib/integrations/shared/connection-status');

    const legacy: GarminTokens = {
      oauth1: { oauth_token: 'oa1', oauth_token_secret: 'sec' },
      oauth2: {
        scope: '',
        jti: '',
        access_token: 'legacy-access',
        token_type: 'Bearer',
        refresh_token: 'legacy-rt',
        expires_in: 0,
        refresh_token_expires_in: 0,
        expires_at: Math.floor(Date.now() / 1000) - 10,
        refresh_token_expires_at: 0,
        last_update_date: new Date().toISOString(),
        expires_date: new Date().toISOString(),
      },
    };

    vi.mocked(prisma.garminAccount.findUnique).mockResolvedValue({
      athleteId: 'ath-1',
      oauth1TokenEnc: 'x',
      oauth2TokenEnc: 'y',
    } as never);
    vi.mocked(prisma.garminAccount.update).mockResolvedValue({} as never);

    await expect(
      buildFreshGarminClient('ath-1', {
        oauth1TokenEnc: encryptGarminToken(legacy.oauth1),
        oauth2TokenEnc: encryptGarminToken(legacy.oauth2),
      }),
    ).rejects.toBeInstanceOf(ProviderAuthError);

    expect(loginWithCredentials).not.toHaveBeenCalled();
    expect(refreshDiGarminTokens).not.toHaveBeenCalled();
  });
});

describe('cron sync must not import SSO login', () => {
  it('api/cron/sync does not reference loginWithCredentials or connectGarmin', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const routePath = path.join(process.cwd(), 'src/app/api/cron/sync/route.ts');
    const source = await fs.readFile(routePath, 'utf8');
    expect(source).not.toMatch(/loginWithCredentials/);
    expect(source).not.toMatch(/connectGarmin/);
    expect(source).not.toMatch(/loginGarminWidget/);
    expect(source).not.toMatch(/loginGarminMobile/);
  });
});
