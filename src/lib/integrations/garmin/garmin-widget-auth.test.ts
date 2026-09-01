import { describe, expect, it, vi } from 'vitest';
import {
  loginGarminWidget,
  SSO_EMBED_URL,
  SSO_SIGNIN_URL,
  GarminWidgetAuthError,
  SimpleCookieJar,
  logWidgetSsoOutcome,
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

function okHtml(html: string, headers?: HeadersInit): Response {
  return new Response(html, { status: 200, headers });
}

describe('loginGarminWidget', () => {
  it('runs embed+signin HTML form without clientId, then exchanges ticket for DI tokens', async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url.startsWith(SSO_EMBED_URL) && method === 'GET') {
        expect(url).not.toContain('clientId=');
        return okHtml('<html>embed</html>', { 'set-cookie': 'SESSION=abc; Path=/' });
      }

      if (url.startsWith(SSO_SIGNIN_URL) && method === 'GET') {
        expect(url).not.toContain('clientId=');
        return okHtml('<html><input name="_csrf" value="csrf-token-1" /></html>');
      }

      if (url.startsWith(SSO_SIGNIN_URL) && method === 'POST') {
        const body = String(init?.body ?? '');
        expect(body).toContain('username=athlete%40example.com');
        expect(body).toContain('_csrf=csrf-token-1');
        expect(body).toContain('embed=true');
        expect(body).toContain('rememberMe=on');
        expect(body).not.toContain('clientId');
        expect(init?.redirect).toBe('manual');
        return okHtml(
          '<html><title>Success</title><a href="https://sso.garmin.com/sso/embed?ticket=ST-widget-1">ok</a></html>',
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
      log: () => undefined,
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
        return okHtml('ok');
      }
      if (url.startsWith(SSO_SIGNIN_URL) && method === 'GET') {
        return okHtml('<html><input name="_csrf" value="c" /></html>');
      }
      if (url.startsWith(SSO_SIGNIN_URL) && method === 'POST') {
        return okHtml(
          `<html><title>GARMIN Authentication Application</title>
           <script>var mfaMethod = "email";</script></html>`,
        );
      }
      throw new Error(`Unexpected ${method} ${url}`);
    });

    await expect(
      loginGarminWidget('a@b.c', 'x', {
        fetch: fetchMock,
        sleep: async () => undefined,
        random: () => 0,
        log: () => undefined,
      }),
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof GarminWidgetAuthError && err.kind === 'mfa_required',
    );
  });

  it('maps invalid/incorrect title to server_sso_rejected (never invalid_credentials)', async () => {
    const logs: Array<{ step?: string; title?: string | null; ticketPresent?: boolean }> = [];
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.startsWith(SSO_EMBED_URL)) return okHtml('ok');
      if (url.startsWith(SSO_SIGNIN_URL) && method === 'GET') {
        return okHtml('<html><input name="_csrf" value="c" /></html>');
      }
      if (url.startsWith(SSO_SIGNIN_URL) && method === 'POST') {
        return okHtml('<html><title>Invalid username or password</title></html>');
      }
      throw new Error(`Unexpected ${method} ${url}`);
    });

    await expect(
      loginGarminWidget('athlete@example.com', 'correct-password', {
        fetch: fetchMock,
        sleep: async () => undefined,
        random: () => 0,
        log: (_msg, meta) => {
          if (meta) logs.push(meta as (typeof logs)[number]);
        },
      }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof GarminWidgetAuthError && err.kind === 'server_sso_rejected',
    );

    const postLog = logs.find((l) => l.title === 'Invalid username or password');
    expect(postLog?.ticketPresent).toBe(false);
  });

  it('keeps Set-Cookie across a 302 hop (manual redirect)', async () => {
    const seenCookies: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      const cookieHeader = (init?.headers as Record<string, string> | undefined)?.Cookie;
      if (cookieHeader) seenCookies.push(cookieHeader);

      if (url.startsWith(SSO_EMBED_URL) && !url.includes('hop=1')) {
        return new Response(null, {
          status: 302,
          headers: {
            location: `${SSO_EMBED_URL}?hop=1`,
            'set-cookie': 'SSO_SESSION=from-hop; Path=/',
          },
        });
      }
      if (url.includes('hop=1')) {
        return okHtml('<html>embed</html>', { 'set-cookie': 'SSO_CSRF=csrfjar; Path=/' });
      }
      if (url.startsWith(SSO_SIGNIN_URL) && method === 'GET') {
        expect(cookieHeader).toContain('SSO_SESSION=from-hop');
        return okHtml('<html><input name="_csrf" value="c" /></html>');
      }
      if (url.startsWith(SSO_SIGNIN_URL) && method === 'POST') {
        return okHtml(
          '<html><title>Success</title><a href="?ticket=ST-redirect-1">x</a></html>',
        );
      }
      if (url === DI_TOKEN_URL) {
        return Response.json({
          access_token: fakeJwt({ client_id: DI_CLIENT_IDS[0] }),
          refresh_token: 'rt',
          expires_in: 60,
        });
      }
      throw new Error(`Unexpected ${method} ${url}`);
    });

    await loginGarminWidget('a@b.c', 'pw', {
      fetch: fetchMock,
      sleep: async () => undefined,
      random: () => 0,
      now: () => 1,
      log: () => undefined,
    });

    expect(seenCookies.some((c) => c.includes('SSO_SESSION=from-hop'))).toBe(true);
  });

  it('maps DI exchange failure after ticket to server_sso_rejected', async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.startsWith(SSO_EMBED_URL)) return okHtml('ok');
      if (url.startsWith(SSO_SIGNIN_URL) && method === 'GET') {
        return okHtml('<html><input name="_csrf" value="c" /></html>');
      }
      if (url.startsWith(SSO_SIGNIN_URL) && method === 'POST') {
        return okHtml(
          '<html><title>Success</title><a href="?ticket=ST-bad-di">x</a></html>',
        );
      }
      if (url === DI_TOKEN_URL) {
        return new Response('nope', { status: 401 });
      }
      throw new Error(`Unexpected ${method} ${url}`);
    });

    await expect(
      loginGarminWidget('a@b.c', 'pw', {
        fetch: fetchMock,
        sleep: async () => undefined,
        random: () => 0,
        log: () => undefined,
      }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof GarminWidgetAuthError && err.kind === 'server_sso_rejected',
    );
  });
});

describe('SimpleCookieJar + logWidgetSsoOutcome', () => {
  it('absorbs getSetCookie lines without exposing values via size()', () => {
    const jar = new SimpleCookieJar();
    const headers = new Headers();
    // Node Headers supports getSetCookie when multiple cookies are appended.
    headers.append('set-cookie', 'A=1; Path=/');
    headers.append('set-cookie', 'B=2; Path=/');
    jar.absorb(new Response('ok', { status: 200, headers }));
    expect(jar.size()).toBeGreaterThanOrEqual(1);
    expect(jar.header()).toMatch(/A=1/);
  });

  it('logs only status/title/ticketPresent (no secret fields)', () => {
    const seen: Array<{ msg: string; meta?: Record<string, unknown> }> = [];
    logWidgetSsoOutcome((msg, meta) => seen.push({ msg, meta }), 'signin-post', {
      status: 200,
      title: 'Invalid username or password',
      ticketPresent: false,
    });
    const meta = seen[0]?.meta ?? {};
    expect(Object.keys(meta).sort()).toEqual(['status', 'step', 'ticketPresent', 'title']);
    expect(meta).not.toHaveProperty('password');
    expect(meta).not.toHaveProperty('csrf');
    expect(meta).not.toHaveProperty('cookie');
    expect(meta).not.toHaveProperty('cookies');
    expect(meta.title).toBe('Invalid username or password');
  });
});
