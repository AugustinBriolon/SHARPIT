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

type FetchRoute = {
  match: (url: string, method: string) => boolean;
  respond: (url: string, init?: RequestInit) => Response | Promise<Response>;
};

function requestMethod(init?: RequestInit): string {
  return (init?.method ?? 'GET').toUpperCase();
}

function createRoutedFetch(routes: FetchRoute[]): typeof fetch {
  return vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const method = requestMethod(init);
    const route = routes.find((candidate) => candidate.match(url, method));
    if (!route) {
      throw new Error(`Unexpected fetch ${method} ${url}`);
    }
    return route.respond(url, init);
  }) as unknown as typeof fetch;
}

function widgetTestDeps(fetchMock: typeof fetch) {
  return {
    fetch: fetchMock,
    sleep: async () => undefined,
    random: () => 0,
    now: () => 1_000_000,
    log: () => undefined,
  };
}

function csrfSigninHtml(token = 'c'): Response {
  return okHtml(`<html><input name="_csrf" value="${token}" /></html>`);
}

function successTicketHtml(ticket: string): Response {
  return okHtml(`<html><title>Success</title><a href="?ticket=${ticket}">x</a></html>`);
}

function mockDiTokenResponse(refreshToken = 'rt-widget'): Response {
  return Response.json({
    access_token: fakeJwt({ client_id: DI_CLIENT_IDS[0] }),
    refresh_token: refreshToken,
    expires_in: 3600,
  });
}

function embedGetRoute(): FetchRoute {
  return {
    match: (url, method) => url.startsWith(SSO_EMBED_URL) && method === 'GET',
    respond: () => okHtml('<html>embed</html>', { 'set-cookie': 'SESSION=abc; Path=/' }),
  };
}

function signinGetRoute(): FetchRoute {
  return {
    match: (url, method) => url.startsWith(SSO_SIGNIN_URL) && method === 'GET',
    respond: (url) => {
      expect(url).not.toContain('clientId=');
      return csrfSigninHtml('csrf-token-1');
    },
  };
}

function happyPathSigninPostRoute(): FetchRoute {
  return {
    match: (url, method) => url.startsWith(SSO_SIGNIN_URL) && method === 'POST',
    respond: (_url, init) => {
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
    },
  };
}

function diExchangeRoute(): FetchRoute {
  return {
    match: (url, method) => url === DI_TOKEN_URL && method === 'POST',
    respond: (_url, init) => {
      const body = String(init?.body ?? '');
      expect(body).toContain('service_ticket=ST-widget-1');
      expect(body).toContain(`client_id=${DI_CLIENT_IDS[0]}`);
      return mockDiTokenResponse();
    },
  };
}

function mockHappyPathWidgetFetch(): typeof fetch {
  return createRoutedFetch([
    {
      ...embedGetRoute(),
      respond: (url) => {
        expect(url).not.toContain('clientId=');
        return okHtml('<html>embed</html>', { 'set-cookie': 'SESSION=abc; Path=/' });
      },
    },
    signinGetRoute(),
    happyPathSigninPostRoute(),
    diExchangeRoute(),
  ]);
}

function mockMfaWidgetFetch(): typeof fetch {
  return createRoutedFetch([
    {
      match: (url) => url.startsWith(SSO_EMBED_URL),
      respond: () => okHtml('ok'),
    },
    {
      match: (url, method) => url.startsWith(SSO_SIGNIN_URL) && method === 'GET',
      respond: () => csrfSigninHtml(),
    },
    {
      match: (url, method) => url.startsWith(SSO_SIGNIN_URL) && method === 'POST',
      respond: () =>
        okHtml(
          `<html><title>GARMIN Authentication Application</title>
           <script>var mfaMethod = "email";</script></html>`,
        ),
    },
  ]);
}

function mockInvalidTitleWidgetFetch(): typeof fetch {
  return createRoutedFetch([
    {
      match: (url) => url.startsWith(SSO_EMBED_URL),
      respond: () => okHtml('ok'),
    },
    {
      match: (url, method) => url.startsWith(SSO_SIGNIN_URL) && method === 'GET',
      respond: () => csrfSigninHtml(),
    },
    {
      match: (url, method) => url.startsWith(SSO_SIGNIN_URL) && method === 'POST',
      respond: () => okHtml('<html><title>Invalid username or password</title></html>'),
    },
  ]);
}

function createRedirectCookieRoutes(_seenCookies: string[]): FetchRoute[] {
  return [
    {
      match: (url, method) =>
        url.startsWith(SSO_EMBED_URL) && method === 'GET' && !url.includes('hop=1'),
      respond: () =>
        new Response(null, {
          status: 302,
          headers: {
            location: `${SSO_EMBED_URL}?hop=1`,
            'set-cookie': 'SSO_SESSION=from-hop; Path=/',
          },
        }),
    },
    {
      match: (url) => url.includes('hop=1'),
      respond: () => okHtml('<html>embed</html>', { 'set-cookie': 'SSO_CSRF=csrfjar; Path=/' }),
    },
    {
      match: (url, method) => url.startsWith(SSO_SIGNIN_URL) && method === 'GET',
      respond: (_url, init) => {
        const cookieHeader = (init?.headers as Record<string, string> | undefined)?.Cookie;
        expect(cookieHeader).toContain('SSO_SESSION=from-hop');
        return csrfSigninHtml();
      },
    },
    {
      match: (url, method) => url.startsWith(SSO_SIGNIN_URL) && method === 'POST',
      respond: () => successTicketHtml('ST-redirect-1'),
    },
    {
      match: (url) => url === DI_TOKEN_URL,
      respond: () => mockDiTokenResponse('rt'),
    },
  ];
}

function mockRedirectCookieWidgetFetch(seenCookies: string[]): typeof fetch {
  const routes = createRedirectCookieRoutes(seenCookies).map((route) => ({
    ...route,
    respond: (url: string, init?: RequestInit) => {
      const cookieHeader = (init?.headers as Record<string, string> | undefined)?.Cookie;
      if (cookieHeader) {
        seenCookies.push(cookieHeader);
      }
      return route.respond(url, init);
    },
  }));
  return createRoutedFetch(routes);
}

function mockDiFailureWidgetFetch(): typeof fetch {
  return createRoutedFetch([
    {
      match: (url) => url.startsWith(SSO_EMBED_URL),
      respond: () => okHtml('ok'),
    },
    {
      match: (url, method) => url.startsWith(SSO_SIGNIN_URL) && method === 'GET',
      respond: () => csrfSigninHtml(),
    },
    {
      match: (url, method) => url.startsWith(SSO_SIGNIN_URL) && method === 'POST',
      respond: () => successTicketHtml('ST-bad-di'),
    },
    {
      match: (url) => url === DI_TOKEN_URL,
      respond: () => new Response('nope', { status: 401 }),
    },
  ]);
}

describe('loginGarminWidget', () => {
  it('runs embed+signin HTML form without clientId, then exchanges ticket for DI tokens', async () => {
    const fetchMock = mockHappyPathWidgetFetch();
    const tokens = await loginGarminWidget(
      'athlete@example.com',
      'secret',
      widgetTestDeps(fetchMock),
    );

    expect(tokens.refreshToken).toBe('rt-widget');
    expect(tokens.diClientId).toBe(DI_CLIENT_IDS[0]);

    const urls = (fetchMock as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/mobile/api/login'))).toBe(false);
    expect(urls.some((u) => u.includes('clientId='))).toBe(false);
  });

  it('surfaces MFA without attempting mobile clientId login', async () => {
    await expect(
      loginGarminWidget('a@b.c', 'x', widgetTestDeps(mockMfaWidgetFetch())),
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof GarminWidgetAuthError && err.kind === 'mfa_required',
    );
  });

  it('maps invalid/incorrect title to server_sso_rejected (never invalid_credentials)', async () => {
    const logs: Array<{ step?: string; title?: string | null; ticketPresent?: boolean }> = [];
    await expect(
      loginGarminWidget('athlete@example.com', 'correct-password', {
        ...widgetTestDeps(mockInvalidTitleWidgetFetch()),
        log: (_msg, meta) => {
          if (meta) {
            logs.push(meta as (typeof logs)[number]);
          }
        },
      }),
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof GarminWidgetAuthError && err.kind === 'server_sso_rejected',
    );

    const postLog = logs.find((l) => l.title === 'Invalid username or password');
    expect(postLog?.ticketPresent).toBe(false);
  });

  it('keeps Set-Cookie across a 302 hop (manual redirect)', async () => {
    const seenCookies: string[] = [];
    await loginGarminWidget('a@b.c', 'pw', {
      ...widgetTestDeps(mockRedirectCookieWidgetFetch(seenCookies)),
      now: () => 1,
    });

    expect(seenCookies.some((c) => c.includes('SSO_SESSION=from-hop'))).toBe(true);
  });

  it('maps DI exchange failure after ticket to server_sso_rejected', async () => {
    await expect(
      loginGarminWidget('a@b.c', 'pw', widgetTestDeps(mockDiFailureWidgetFetch())),
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof GarminWidgetAuthError && err.kind === 'server_sso_rejected',
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
