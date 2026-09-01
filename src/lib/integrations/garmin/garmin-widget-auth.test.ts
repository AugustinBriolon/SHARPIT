import { describe, expect, it, vi } from 'vitest';
import {
  loginGarminWidget,
  SSO_EMBED_URL,
  SSO_SIGNIN_URL,
  GarminWidgetAuthError,
} from '@/lib/integrations/garmin/garmin-widget-auth';
import { DI_CLIENT_IDS, DI_TOKEN_URL } from '@/lib/integrations/garmin/garmin-di-oauth';

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

describe('loginGarminWidget', () => {
  it('runs embed+signin HTML form without clientId, then exchanges ticket for DI tokens', async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url.startsWith(SSO_EMBED_URL) && method === 'GET') {
        expect(url).not.toContain('clientId=');
        return new Response('<html>embed</html>', {
          status: 200,
          headers: { 'set-cookie': 'SESSION=abc; Path=/' },
        });
      }

      if (url.startsWith(SSO_SIGNIN_URL) && method === 'GET') {
        expect(url).not.toContain('clientId=');
        return new Response(
          '<html><input name="_csrf" value="csrf-token-1" /></html>',
          { status: 200 },
        );
      }

      if (url.startsWith(SSO_SIGNIN_URL) && method === 'POST') {
        const body = String(init?.body ?? '');
        expect(body).toContain('username=athlete%40example.com');
        expect(body).toContain('_csrf=csrf-token-1');
        expect(body).not.toContain('clientId');
        return new Response(
          '<html><title>Success</title><a href="https://sso.garmin.com/sso/embed?ticket=ST-widget-1">ok</a></html>',
          { status: 200 },
        );
      }

      if (url === DI_TOKEN_URL && method === 'POST') {
        const body = String(init?.body ?? '');
        expect(body).toContain('service_ticket=ST-widget-1');
        expect(body).toContain(`client_id=${DI_CLIENT_IDS[0]}`);
        return Response.json({
          access_token: fakeJwt({ client_id: DI_CLIENT_IDS[0] }),
          refresh_token: 'rt-widget',
          expires_in: 3600,
        });
      }

      throw new Error(`Unexpected fetch ${method} ${url}`);
    });

    const tokens = await loginGarminWidget('athlete@example.com', 'secret', {
      fetch: fetchMock,
      sleep: async () => undefined,
      random: () => 0,
      now: () => 1_000_000,
    });

    expect(tokens.refreshToken).toBe('rt-widget');
    expect(tokens.diClientId).toBe(DI_CLIENT_IDS[0]);

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/mobile/api/login'))).toBe(false);
    expect(urls.some((u) => u.includes('clientId='))).toBe(false);
  });

  it('surfaces MFA without attempting mobile clientId login', async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.startsWith(SSO_EMBED_URL)) {
        return new Response('ok', { status: 200 });
      }
      if (url.startsWith(SSO_SIGNIN_URL) && method === 'GET') {
        return new Response('<html><input name="_csrf" value="c" /></html>', { status: 200 });
      }
      if (url.startsWith(SSO_SIGNIN_URL) && method === 'POST') {
        return new Response(
          `<html><title>GARMIN Authentication Application</title>
           <script>var mfaMethod = "email";</script></html>`,
          { status: 200 },
        );
      }
      throw new Error(`Unexpected ${method} ${url}`);
    });

    await expect(
      loginGarminWidget('a@b.c', 'x', {
        fetch: fetchMock,
        sleep: async () => undefined,
        random: () => 0,
      }),
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof GarminWidgetAuthError && err.kind === 'mfa_required',
    );
  });
});
