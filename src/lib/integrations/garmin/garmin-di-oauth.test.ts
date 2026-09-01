import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DI_CLIENT_IDS,
  DI_TOKEN_URL,
  exchangeServiceTicketForDiTokens,
  refreshDiAccessToken,
  GarminDiAuthError,
} from '@/lib/integrations/garmin/garmin-di-oauth';

function b64url(json: object): string {
  return Buffer.from(JSON.stringify(json))
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fakeJwt(payload: object): string {
  return `hdr.${b64url(payload)}.sig`;
}

describe('garmin-di-oauth', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('exchanges a service ticket using DI client id rotation (no SSO)', async () => {
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const body = String(init?.body ?? '');
      expect(body).toContain('service_ticket=ST-abc');
      expect(body).toContain('grant_type=');
      const clientId = new URLSearchParams(body).get('client_id');
      if (clientId === DI_CLIENT_IDS[0]) {
        return new Response('nope', { status: 401 });
      }
      return Response.json({
        access_token: fakeJwt({ client_id: DI_CLIENT_IDS[1], exp: 9999999999 }),
        refresh_token: 'refresh-1',
        expires_in: 3600,
      });
    });

    const tokens = await exchangeServiceTicketForDiTokens(
      'ST-abc',
      'https://sso.garmin.com/sso/embed',
      { fetch: fetchMock, now: () => 1_000_000 },
    );

    expect(tokens.refreshToken).toBe('refresh-1');
    expect(tokens.diClientId).toBe(DI_CLIENT_IDS[1]);
    expect(tokens.accessToken).toContain('hdr.');
    expect(fetchMock).toHaveBeenCalled();
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.every((u) => u === DI_TOKEN_URL)).toBe(true);
  });

  it('refreshes access token without any SSO/login request', async () => {
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const body = String(init?.body ?? '');
      expect(body).toContain('grant_type=refresh_token');
      expect(body).toContain('refresh_token=rt-old');
      expect(body).not.toContain('username');
      expect(body).not.toContain('password');
      expect(body).not.toContain('service_ticket');
      return Response.json({
        access_token: fakeJwt({ client_id: 'GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2' }),
        refresh_token: 'rt-new',
        expires_in: 1800,
      });
    });

    const tokens = await refreshDiAccessToken(
      {
        refreshToken: 'rt-old',
        diClientId: 'GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2',
      },
      { fetch: fetchMock, now: () => 5_000_000 },
    );

    expect(tokens.refreshToken).toBe('rt-new');
    expect(tokens.expiresAt).toBe(5_000_000 + 1800 * 1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('marks expired/invalid refresh as invalid_credentials (needs reconnect)', async () => {
    const fetchMock = vi.fn(async () => new Response('expired', { status: 401 }));

    await expect(
      refreshDiAccessToken(
        { refreshToken: 'dead', diClientId: 'GARMIN_CONNECT_MOBILE_ANDROID_DI' },
        { fetch: fetchMock },
      ),
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof GarminDiAuthError && err.kind === 'invalid_credentials',
    );
  });
});
