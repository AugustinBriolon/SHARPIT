import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GARMIN_SSO_EMBED_SERVICE } from '@sharpit/app/lib/integrations/garmin/garmin-browser-sso-shared';

const exchangeServiceTicketForDiTokens = vi.fn();
const importGarminDiTokenStore = vi.fn();
const redirectAfterIntegrationConnect = vi.fn(
  async (_req: unknown, _state: unknown, _provider: string, status: string) =>
    NextResponseRedirect(`https://app.example.com/settings/integrations?garmin=${status}`),
);
const getCurrentAthleteId = vi.fn(async () => 'ath-1');

function NextResponseRedirect(url: string) {
  return new Response(null, { status: 302, headers: { Location: url } });
}

vi.mock('@sharpit/server/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: () => getCurrentAthleteId(),
}));

vi.mock('@sharpit/server/lib/integrations/garmin/garmin-di-oauth', () => ({
  exchangeServiceTicketForDiTokens: (...args: [string, string]) =>
    exchangeServiceTicketForDiTokens(...args),
}));

vi.mock('@sharpit/server/lib/integrations/garmin/garmin-sync', () => ({
  importGarminDiTokenStore: (...args: [string, unknown]) => importGarminDiTokenStore(...args),
}));

vi.mock('@sharpit/server/lib/integrations/oauth-return', () => ({
  redirectAfterIntegrationConnect: (...args: [unknown, unknown, string, string]) =>
    redirectAfterIntegrationConnect(...args),
}));

const CONTEXT = {
  returnTo: '/settings/integrations',
  dataClass: null,
  webOrigin: 'https://web.sharpit.app',
  redirectUri: null,
};

async function garminState(athleteId: string): Promise<string> {
  const { createConnectState } = await import('@sharpit/server/lib/integrations/oauth-state');
  return createConnectState({ ...CONTEXT, provider: 'garmin', athleteId });
}

function ssoRequest(body: Record<string, unknown>) {
  return {
    nextUrl: new URL('https://api.sharpit.app/api/garmin/sso-callback'),
    url: 'https://api.sharpit.app/api/garmin/sso-callback',
    json: async () => body,
  } as never;
}

describe('/api/garmin/sso-callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SECRET_ENCRYPTION_KEY = 'sso-callback-test';
    vi.resetModules();
  });

  it('POST exchanges ticket with embed service_url and returns redirect JSON', async () => {
    const state = await garminState('ath-1');

    exchangeServiceTicketForDiTokens.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh-token-long',
      expiresAt: Date.now() + 3600_000,
      diClientId: 'GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2',
    });
    importGarminDiTokenStore.mockResolvedValue({ displayName: 'A', fullName: null });

    const { POST } = await import('./handler');
    const request = {
      nextUrl: new URL('https://app.example.com/api/garmin/sso-callback'),
      url: 'https://app.example.com/api/garmin/sso-callback',
      json: async () => ({ ticket: 'ST-abc-123', state }),
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
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.redirectTo).toContain('garmin=connected');
  });

  it.each([
    ['missing', undefined],
    ['forged', 'forged.state'],
  ])('rejects a %s state without exchanging', async (_label, state) => {
    const { POST } = await import('./handler');
    const response = await POST(ssoRequest({ ticket: 'ST-abc', state }));
    const body = (await response.json()) as { status: string };

    expect(exchangeServiceTicketForDiTokens).not.toHaveBeenCalled();
    expect(body.status).toBe('invalid_state');
    expect(response.status).toBe(400);
  });

  it('rejects a state issued to another athlete', async () => {
    const { POST } = await import('./handler');
    const response = await POST(
      ssoRequest({ ticket: 'ST-abc', state: await garminState('ath-2') }),
    );

    expect(exchangeServiceTicketForDiTokens).not.toHaveBeenCalled();
    expect(((await response.json()) as { status: string }).status).toBe('invalid_state');
  });

  it('rejects a state issued for another provider', async () => {
    const { createConnectState } = await import('@sharpit/server/lib/integrations/oauth-state');
    const state = createConnectState({ ...CONTEXT, provider: 'strava', athleteId: 'ath-1' });
    const { POST } = await import('./handler');
    const response = await POST(ssoRequest({ ticket: 'ST-abc', state }));

    expect(exchangeServiceTicketForDiTokens).not.toHaveBeenCalled();
    expect(((await response.json()) as { status: string }).status).toBe('invalid_state');
  });
});
