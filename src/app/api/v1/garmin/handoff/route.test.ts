import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  userId: null as string | null,
  createSignInToken: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: state.userId }),
  clerkClient: async () => ({ signInTokens: { createSignInToken: state.createSignInToken } }),
}));

async function post(url = 'https://api.sharpit.app/api/v1/garmin/handoff') {
  const { POST } = await import('./route');
  return POST(new NextRequest(url, { method: 'POST' }));
}

describe('POST /api/v1/garmin/handoff', () => {
  beforeEach(() => {
    state.userId = null;
    state.createSignInToken.mockReset();
    state.createSignInToken.mockResolvedValue({ token: 'ticket-secret' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('refuses a request without a signed-in athlete', async () => {
    const response = await post();
    expect(response.status).toBe(401);
    expect(state.createSignInToken).not.toHaveBeenCalled();
  });

  it('mints a one-minute ticket for the Bearer’s own user', async () => {
    state.userId = 'user_1';
    await post();
    expect(state.createSignInToken).toHaveBeenCalledWith({
      userId: 'user_1',
      expiresInSeconds: 60,
    });
  });

  it('hands off on the apex in production, whatever host was called, and is never cached', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    state.userId = 'user_1';

    const response = await post();
    const url = new URL((await response.json()).url);

    expect(url.origin).toBe('https://sharpit.app');
    expect(url.pathname).toBe('/sign-in');
    expect(url.searchParams.get('__clerk_ticket')).toBe('ticket-secret');
    expect(url.searchParams.get('redirect_url')).toBe('https://sharpit.app/connect/garmin/start');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('hands off on the local server in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    state.userId = 'user_1';

    const response = await post('http://localhost:3000/api/v1/garmin/handoff');

    expect(new URL((await response.json()).url).origin).toBe('http://localhost:3000');
  });

  it('never logs the ticket when Clerk fails', async () => {
    state.userId = 'user_1';
    state.createSignInToken.mockRejectedValueOnce(new Error('Clerk down for ticket-secret'));

    const response = await post();

    expect(response.status).toBe(500);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('ticket-secret');
  });
});
