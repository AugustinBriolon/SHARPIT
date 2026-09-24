import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const state = vi.hoisted(() => ({
  userId: null as string | null,
  clerkError: null as Error | null,
  protect: vi.fn(),
  options: undefined as unknown,
}));

vi.mock('@clerk/nextjs/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clerk/nextjs/server')>();
  return {
    ...actual,
    clerkMiddleware: (
      handler: (auth: unknown, req: NextRequest) => Promise<Response | void>,
      options: unknown,
    ) => {
      state.options = options;
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

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  rateLimiters: { apiGeneral: {} },
  rateLimitResponseBody: vi.fn(),
}));

vi.mock('@/lib/dev/dev-auth', () => ({ isDevClerkBypass: () => false }));

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

  it('sends a signed-in athlete from the teaser to Today', async () => {
    state.userId = 'user_1';
    const response = await run('https://sharpit.app/welcome');
    expect(response.headers.get('location')).toBe('https://sharpit.app/');
  });

  it('sends a signed-in athlete from sign-in to where Clerk was taking them', async () => {
    state.userId = 'user_1';
    const back = encodeURIComponent('https://sharpit.app/connect/garmin');
    const response = await run(`https://sharpit.app/sign-in?redirect_url=${back}`);
    expect(response.headers.get('location')).toBe('https://sharpit.app/connect/garmin');
  });

  it('sends a signed-in athlete from sign-up to Today, never back to the teaser', async () => {
    state.userId = 'user_1';
    const back = encodeURIComponent('https://sharpit.app/welcome');
    const response = await run(`https://sharpit.app/sign-up?redirect_url=${back}`);
    expect(response.headers.get('location')).toBe('https://sharpit.app/');
  });

  it('protects athlete pages and the Garmin handoff entry', async () => {
    await run('https://sharpit.app/connect/garmin');
    await run('https://sharpit.app/connect/garmin/start');
    expect(state.protect).toHaveBeenCalledTimes(2);
  });

  it('keeps the AASA and the Garmin callback public', async () => {
    await run('https://sharpit.app/.well-known/apple-app-site-association');
    await run('https://sharpit.app/connect/garmin/callback?garmin=connected');
    expect(state.protect).not.toHaveBeenCalled();
  });

  it('lets a demo visitor read without a session', async () => {
    const response = await run('https://sharpit.app/', 'sharpit_demo=1');
    expect(state.protect).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBeNull();
  });

  it('points auth.protect at the app’s own sign-in pages', async () => {
    await import('./proxy');
    expect(state.options).toEqual({ signInUrl: '/sign-in', signUpUrl: '/sign-up' });
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
