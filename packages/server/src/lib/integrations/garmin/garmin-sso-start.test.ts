import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const account = vi.fn();
const canConnect = vi.fn();

vi.mock('server-only', () => ({}));
vi.mock('@sharpit/server/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: async () => 'ath-1',
}));
vi.mock('@sharpit/server/lib/integrations/garmin/garmin-sync', () => ({
  getGarminAccount: () => account(),
}));
vi.mock('@sharpit/server/lib/privacy/consent-store', () => ({
  athleteCanConnectProvider: () => canConnect(),
}));
vi.mock('@sharpit/server/lib/integrations/source-prefs-store', () => ({
  persistSourcePrefsMutation: vi.fn(),
}));

/** The in-app handoff runs on the apex (ADR-047) and asks `api.` for its next URL. */
function handoffRequest() {
  return new NextRequest('https://api.sharpit.app/api/garmin/connect', {
    headers: { accept: 'application/json', origin: 'https://sharpit.app' },
  });
}

async function nextUrl(response: Response): Promise<URL> {
  return new URL(((await response.json()) as { url: string }).url);
}

describe('Garmin handoff start', () => {
  beforeEach(() => {
    vi.stubEnv('SECRET_ENCRYPTION_KEY', 'handoff-test');
    account.mockResolvedValue(null);
    canConnect.mockResolvedValue(true);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('opens the authorize page on the apex, carrying a garmin state for the athlete', async () => {
    const { startGarminHandoff } = await import('./garmin-sso-start');
    const { readConnectState } = await import('../oauth-state');
    const url = await nextUrl(await startGarminHandoff(handoffRequest()));

    expect(url.origin + url.pathname).toBe('https://sharpit.app/connect/garmin/authorize');
    expect(readConnectState(url.searchParams.get('state'), 'garmin')).toMatchObject({
      athleteId: 'ath-1',
      returnTo: '/connect/garmin/callback',
      webOrigin: 'https://sharpit.app',
    });
  });

  it.each([
    ['already_connected', () => account.mockResolvedValue({ id: 'g' })],
    ['consent_required', () => canConnect.mockResolvedValue(false)],
    ['error', () => account.mockRejectedValue(new Error('db down'))],
  ])('ends on the callback with %s', async (status, arrange) => {
    arrange();
    const { startGarminHandoff } = await import('./garmin-sso-start');
    const url = await nextUrl(await startGarminHandoff(handoffRequest()));

    expect(url.toString()).toBe(`https://sharpit.app/connect/garmin/callback?garmin=${status}`);
  });
});
