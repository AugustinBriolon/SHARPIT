import { describe, expect, it, vi } from 'vitest';
import {
  loginGarminMobile,
  MOBILE_CLIENT_ID,
  MOBILE_SERVICE_URL,
  GarminMobileAuthError,
} from '@/lib/integrations/garmin/garmin-mobile-auth';
import { DI_TOKEN_URL, DI_GRANT_TYPE } from '@/lib/integrations/garmin/garmin-di-oauth';

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

describe('loginGarminMobile', () => {
  it('logs in via mobile API then exchanges ticket with GCM_ANDROID_DARK', async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url.includes('/mobile/api/login') && method === 'POST') {
        expect(url).toContain(`clientId=${MOBILE_CLIENT_ID}`);
        expect(url).toContain(encodeURIComponent(MOBILE_SERVICE_URL));
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
        expect(body.username).toBe('athlete@example.com');
        expect(body.rememberMe).toBe(true);
        return Response.json({
          responseStatus: { type: 'SUCCESSFUL' },
          serviceTicketId: 'ST-mobile-1',
        });
      }

      if (url === DI_TOKEN_URL && method === 'POST') {
        const body = String(init?.body ?? '');
        expect(body).toContain('service_ticket=ST-mobile-1');
        expect(body).toContain(`client_id=${MOBILE_CLIENT_ID}`);
        expect(body).toContain(`grant_type=${encodeURIComponent(DI_GRANT_TYPE)}`);
        expect(body).toContain(`service_url=${encodeURIComponent(MOBILE_SERVICE_URL)}`);
        return Response.json({
          access_token: fakeJwt({ client_id: MOBILE_CLIENT_ID }),
          refresh_token: 'rt-mobile',
          expires_in: 3600,
        });
      }

      throw new Error(`Unexpected ${method} ${url}`);
    });

    const original = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const tokens = await loginGarminMobile('athlete@example.com', 'secret');
      expect(tokens.refreshToken).toBe('rt-mobile');
      expect(tokens.diClientId).toBe(MOBILE_CLIENT_ID);
    } finally {
      globalThis.fetch = original;
    }
  });

  it('maps non-SUCCESSFUL mobile responses to invalid_credentials', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ responseStatus: { type: 'FAILURE' } }),
    );
    const original = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      await expect(loginGarminMobile('a', 'b')).rejects.toSatisfy(
        (err: unknown) =>
          err instanceof GarminMobileAuthError && err.kind === 'invalid_credentials',
      );
    } finally {
      globalThis.fetch = original;
    }
  });
});
