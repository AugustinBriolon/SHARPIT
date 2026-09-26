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

async function run(url: string, cookie?: string, method = 'GET') {
  const { default: proxy } = await import('./proxy');
  const req = new NextRequest(url, { method, headers: cookie ? { cookie } : {} });
  return (await proxy(req, {} as never)) ?? NextResponse.next();
}

describe('hub proxy (sharpit.app)', () => {
  beforeEach(() => {
    state.userId = null;
    state.clerkError = null;
    state.protect.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('asks a stranger to sign in for every step of the Garmin handoff that needs a session', async () => {
    await run('https://sharpit.app/connect/garmin');
    await run('https://sharpit.app/connect/garmin/start');
    await run('https://sharpit.app/connect/garmin/authorize?state=s');
    expect(state.protect).toHaveBeenCalledTimes(3);
  });

  it('keeps the callback, the legal pages and the sign-in public', async () => {
    await run('https://sharpit.app/connect/garmin/callback?garmin=connected');
    await run('https://sharpit.app/privacy');
    await run('https://sharpit.app/terms');
    await run('https://sharpit.app/sign-in');
    expect(state.protect).not.toHaveBeenCalled();
  });

  it('sends a signed-in visitor from sign-in back into the handoff', async () => {
    state.userId = 'user_1';
    const back = encodeURIComponent('https://sharpit.app/connect/garmin/start');
    const response = await run(`https://sharpit.app/sign-in?redirect_url=${back}`);
    expect(response.headers.get('location')).toBe('https://sharpit.app/connect/garmin/start');
  });

  it('never runs on the AASA: Apple fetches it without a session or a redirect', async () => {
    const { config } = await import('./proxy');
    const matcher = new RegExp(`^${config.matcher[0]}$`);
    expect(matcher.test('/.well-known/apple-app-site-association')).toBe(false);
    expect(matcher.test('/connect/garmin')).toBe(true);
  });

  it('points auth.protect at the apex sign-in', async () => {
    await import('./proxy');
    expect(state.options).toContainEqual({ signInUrl: '/sign-in', signUpUrl: '/sign-up' });
  });
});
