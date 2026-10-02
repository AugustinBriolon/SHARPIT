import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, apiRequest, navigateToConnect } from './api-fetch';

function signIn(token: string | null) {
  vi.stubGlobal('Clerk', { loaded: true, session: token ? { getToken: async () => token } : null });
}

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_ORIGIN', 'https://api.sharpit.app');
    signIn('tok');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends /api calls to api. with the Clerk session as a Bearer, never a cookie', async () => {
    const { url, init } = await apiRequest('/api/presentation/today?x=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(url).toBe('https://api.sharpit.app/api/presentation/today?x=1');
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toBe('Bearer tok');
    expect(headers.get('content-type')).toBe('application/json');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
  });

  it('stays relative without an api origin (tests)', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_ORIGIN', '');
    expect((await apiRequest('/api/goals')).url).toBe('/api/goals');
  });

  it('still goes to api. without a session — api. answers the 401', async () => {
    signIn(null);
    const { url, init } = await apiRequest('/api/goals');
    expect(url).toBe('https://api.sharpit.app/api/goals');
    expect(new Headers(init.headers).has('authorization')).toBe(false);
  });

  it('waits for Clerk to load before asking for the token', async () => {
    const clerk: { loaded: boolean; session: { getToken(): Promise<string> } } = {
      loaded: false,
      session: { getToken: async () => 'late' },
    };
    vi.stubGlobal('Clerk', clerk);
    setTimeout(() => {
      clerk.loaded = true;
    }, 120);
    const { init } = await apiRequest('/api/goals');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer late');
  });

  it('leaves anything but /api alone', async () => {
    expect((await apiRequest('/settings')).url).toBe('/settings');
  });

  it('fetches the resolved request', async () => {
    const fetchSpy = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetchSpy);
    await apiFetch('/api/goals');
    expect(fetchSpy).toHaveBeenCalledWith('https://api.sharpit.app/api/goals', expect.anything());
  });
});

describe('navigateToConnect', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks for the next URL as JSON and navigates there', async () => {
    const assign = vi.fn();
    vi.stubGlobal('window', { location: { assign } });
    const fetchSpy = vi.fn(async () => Response.json({ url: 'https://www.strava.com/oauth' }));
    vi.stubGlobal('fetch', fetchSpy);

    await navigateToConnect('/api/strava/connect?returnTo=/onboarding');

    const init = (fetchSpy.mock.calls[0] as unknown[])[1] as RequestInit;
    expect(new Headers(init.headers).get('accept')).toBe('application/json');
    expect(assign).toHaveBeenCalledWith('https://www.strava.com/oauth');
  });

  it('surfaces the server error when there is no URL', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ error: 'Strava indisponible' }));
    await expect(navigateToConnect('/api/strava/connect')).rejects.toThrow('Strava indisponible');
  });
});
