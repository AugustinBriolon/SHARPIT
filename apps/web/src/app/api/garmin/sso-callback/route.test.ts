import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GARMIN_SSO_EMBED_SERVICE } from '@/lib/integrations/garmin/garmin-browser-sso-shared';

const exchangeServiceTicketForDiTokens = vi.fn();
const importGarminDiTokenStore = vi.fn();
const redirectAfterIntegrationConnect = vi.fn(
  async (_req: unknown, _provider: string, status: string) =>
    NextResponseRedirect(`https://app.example.com/settings/integrations?garmin=${status}`),
);
const getCurrentAthleteId = vi.fn(async () => 'ath-1');

function NextResponseRedirect(url: string) {
  return new Response(null, { status: 302, headers: { Location: url } });
}

const cookieStore = {
  get: vi.fn(),
  delete: vi.fn(),
  set: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: async () => cookieStore,
}));

vi.mock('@/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: () => getCurrentAthleteId(),
}));

vi.mock('@/lib/integrations/garmin/garmin-di-oauth', () => ({
  exchangeServiceTicketForDiTokens: (...args: [string, string]) =>
    exchangeServiceTicketForDiTokens(...args),
}));

vi.mock('@/lib/integrations/garmin/garmin-sync', () => ({
  importGarminDiTokenStore: (...args: [string, unknown]) => importGarminDiTokenStore(...args),
}));

vi.mock('@/lib/integrations/oauth-return', () => ({
  redirectAfterIntegrationConnect: (...args: [unknown, string, string]) =>
    redirectAfterIntegrationConnect(...args),
}));

describe('/api/garmin/sso-callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SECRET_ENCRYPTION_KEY = 'sso-callback-test';
    vi.resetModules();
  });

  it('POST exchanges ticket with embed service_url and returns redirect JSON', async () => {
    const { createGarminSsoState, GARMIN_SSO_STATE_COOKIE } =
      await import('@/lib/integrations/garmin/garmin-browser-sso');
    const state = createGarminSsoState({ athleteId: 'ath-1' });
    cookieStore.get.mockReturnValue({ value: state });

    exchangeServiceTicketForDiTokens.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh-token-long',
      expiresAt: Date.now() + 3600_000,
      diClientId: 'GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2',
    });
    importGarminDiTokenStore.mockResolvedValue({ displayName: 'A', fullName: null });

    const { POST } = await import('./route');
    const request = {
      nextUrl: new URL('https://app.example.com/api/garmin/sso-callback'),
      url: 'https://app.example.com/api/garmin/sso-callback',
      json: async () => ({ ticket: 'ST-abc-123' }),
    } as never;

    const response = await POST(request);
    const body = (await response.json()) as { ok: boolean; redirectTo: string };

    expect(exchangeServiceTicketForDiTokens).toHaveBeenCalledWith(
      'ST-abc-123',
      GARMIN_SSO_EMBED_SERVICE,
    );
    expect(importGarminDiTokenStore).toHaveBeenCalledWith('ath-1', {
      di_token: 'access',
      di_refresh_token: 'refresh-token-long',
      di_client_id: 'GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2',
    });
    expect(cookieStore.delete).toHaveBeenCalledWith(GARMIN_SSO_STATE_COOKIE);
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.redirectTo).toContain('garmin=connected');
  });

  it('rejects missing/invalid state without exchanging', async () => {
    cookieStore.get.mockReturnValue(undefined);
    const { POST } = await import('./route');
    const request = {
      nextUrl: new URL('https://app.example.com/api/garmin/sso-callback'),
      url: 'https://app.example.com/api/garmin/sso-callback',
      json: async () => ({ ticket: 'ST-abc' }),
    } as never;

    const response = await POST(request);
    const body = (await response.json()) as { status: string };

    expect(exchangeServiceTicketForDiTokens).not.toHaveBeenCalled();
    expect(body.status).toBe('invalid_state');
    expect(response.status).toBe(400);
  });
});
