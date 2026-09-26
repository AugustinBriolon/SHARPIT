import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const state = vi.hoisted(() => ({
  userId: null as string | null,
  clerkError: null as Error | null,
  protect: vi.fn(),
  options: [] as unknown[],
}));

vi.mock('@clerk/nextjs/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clerk/nextjs/server')>();
  return {
    ...actual,
    clerkMiddleware: (
      handler: (auth: unknown, req: NextRequest) => Promise<Response | void>,
      options: unknown,
    ) => {
      state.options.push(options);
      return async (req: NextRequest) => {
        if (state.clerkError) {
          throw state.clerkError;
        }
        const auth = Object.assign(async () => ({ userId: state.userId }), {
          protect: state.protect,
        });
        return (await handler(auth, req)) ?? NextResponse.next();
      };
    },
  };
});

vi.mock('@sharpit/server/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  rateLimiters: { apiGeneral: {} },
  rateLimitResponseBody: vi.fn(),
}));

vi.mock('@sharpit/server/lib/dev/dev-auth', () => ({ isDevClerkBypass: () => false }));

async function run(url: string, cookie?: string) {
  const { default: proxy } = await import('./proxy');
  const req = new NextRequest(url, { headers: cookie ? { cookie } : {} });
  return (await proxy(req, {} as never)) ?? NextResponse.next();
}

describe('proxy', () => {
  beforeEach(() => {
    state.userId = null;
    state.clerkError = null;
    state.protect.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('sends strangers from Today to the teaser', async () => {
    const response = await run('https://sharpit.app/');
    expect(response.headers.get('location')).toBe('https://sharpit.app/welcome');
  });

  it('keeps the teaser for strangers', async () => {
    const response = await run('https://sharpit.app/welcome');
    expect(response.headers.get('location')).toBeNull();
    expect(state.protect).not.toHaveBeenCalled();
  });

  it('keeps a signed-in athlete on Today', async () => {
    state.userId = 'user_1';
    const response = await run('https://sharpit.app/');
    expect(response.headers.get('location')).toBeNull();
  });

  it('sends a signed-in athlete from the teaser to their next screen', async () => {
    state.userId = 'user_1';
    const response = await run('https://sharpit.app/welcome');
    expect(response.headers.get('location')).toBe('https://sharpit.app/start');
  });

  it('sends a signed-in athlete from sign-in to where Clerk was taking them', async () => {
    state.userId = 'user_1';
    const back = encodeURIComponent('https://sharpit.app/connect/garmin');
    const response = await run(`https://sharpit.app/sign-in?redirect_url=${back}`);
    expect(response.headers.get('location')).toBe('https://sharpit.app/connect/garmin');
  });

  it('sends a signed-in athlete from sign-up to their next screen, never the teaser', async () => {
    state.userId = 'user_1';
    const back = encodeURIComponent('https://sharpit.app/welcome');
    const response = await run(`https://sharpit.app/sign-up?redirect_url=${back}`);
    expect(response.headers.get('location')).toBe('https://sharpit.app/start');
  });

  it('protects athlete pages, the entry router and the Garmin handoff entry', async () => {
    await run('https://sharpit.app/connect/garmin');
    await run('https://sharpit.app/connect/garmin/start');
    await run('https://sharpit.app/start');
    expect(state.protect).toHaveBeenCalledTimes(3);
  });

  it('keeps the AASA and the Garmin callback public', async () => {
    await run('https://sharpit.app/.well-known/apple-app-site-association');
    await run('https://sharpit.app/connect/garmin/callback?garmin=connected');
    await run('https://sharpit.app/api/billing/apple/notifications');
    expect(state.protect).not.toHaveBeenCalled();
  });

  it('lets a demo visitor read without a session', async () => {
    const response = await run('https://sharpit.app/', 'sharpit_demo=1');
    expect(state.protect).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBeNull();
  });

  it('points auth.protect at the app’s own sign-in pages', async () => {
    await import('./proxy');
    expect(state.options).toContainEqual({ signInUrl: '/sign-in', signUpUrl: '/sign-up' });
  });

  it('turns a failed handshake into a clean retry, not a 500', async () => {
    state.clerkError = new Error('Clerk: Handshake token verification failed: invalid signature.');
    const response = await run('https://sharpit.app/?__clerk_handshake=SECRETVALUE');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://sharpit.app/');
  });

  it('still surfaces errors unrelated to a handshake', async () => {
    state.clerkError = new Error('boom');
    await expect(run('https://sharpit.app/plan')).rejects.toThrow('boom');
  });
});

async function runOn(
  url: string,
  init: { method?: string; headers?: Record<string, string> } = {},
) {
  const { default: proxy } = await import('./proxy');
  const req = new NextRequest(url, { method: init.method ?? 'GET', headers: init.headers ?? {} });
  return (await proxy(req, {} as never)) ?? NextResponse.next();
}

describe('proxy — api.sharpit.app', () => {
  const bearer = { authorization: 'Bearer token' };

  beforeEach(() => {
    state.userId = null;
    state.clerkError = null;
    state.protect.mockReset();
  });

  it('refuses a request without a Bearer with a JSON 401, not the sign-in or a 404 page', async () => {
    const response = await runOn('https://api.sharpit.app/api/v1/today', {
      headers: { cookie: '__session=cookie-session' },
    });
    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(state.protect).not.toHaveBeenCalled();
  });

  it('refuses a Bearer Clerk rejects with a JSON 401', async () => {
    const response = await runOn('https://api.sharpit.app/api/v1/today', { headers: bearer });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Invalid or expired token' });
  });

  it('lets a valid Bearer through, uncached and without cookies', async () => {
    state.userId = 'user_1';
    const response = await runOn('https://api.sharpit.app/api/v1/today', { headers: bearer });
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('serves no page, no AASA and no Garmin handoff', async () => {
    for (const path of [
      '/',
      '/welcome',
      '/.well-known/apple-app-site-association',
      '/connect/garmin',
    ]) {
      const response = await runOn(`https://api.sharpit.app${path}`, { headers: bearer });
      expect(response.status).toBe(404);
      expect(response.headers.get('content-type')).toContain('application/json');
    }
  });

  it('allows the thin web as the only CORS origin', async () => {
    state.userId = 'user_1';
    const web = await runOn('https://api.sharpit.app/api/v1/today', {
      headers: { ...bearer, origin: 'https://web.sharpit.app' },
    });
    const other = await runOn('https://api.sharpit.app/api/v1/today', {
      headers: { ...bearer, origin: 'https://sharpit.app' },
    });
    expect(web.headers.get('access-control-allow-origin')).toBe('https://web.sharpit.app');
    expect(other.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('leaves the apex AASA and Garmin handoff exactly as they were', async () => {
    const aasa = await runOn('https://sharpit.app/.well-known/apple-app-site-association');
    const callback = await runOn('https://sharpit.app/connect/garmin/callback?garmin=connected');
    expect(aasa.status).toBe(200);
    expect(aasa.headers.get('location')).toBeNull();
    expect(callback.status).toBe(200);
    expect(state.protect).not.toHaveBeenCalled();
  });
});
