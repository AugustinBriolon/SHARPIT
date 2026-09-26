import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const serverApiFetch = vi.fn();
vi.mock('@/server/api-client', () => ({
  serverApiFetch: (...args: unknown[]) => serverApiFetch(...args),
}));

describe('GET /connect/garmin/start', () => {
  beforeEach(() => {
    serverApiFetch.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('asks api. for the handoff’s next page, as the apex, and goes there', async () => {
    serverApiFetch.mockResolvedValue(
      Response.json({ url: 'https://sharpit.app/connect/garmin/authorize?state=s' }),
    );
    const { GET } = await import('./route');
    const response = await GET(new NextRequest('https://sharpit.app/connect/garmin/start'));

    const [path, init] = serverApiFetch.mock.calls[0] as [string, { origin: string }];
    expect(path).toBe('/api/garmin/connect?returnTo=%2Fconnect%2Fgarmin%2Fcallback');
    expect(init.origin).toBe('https://sharpit.app');
    expect(response.headers.get('location')).toBe(
      'https://sharpit.app/connect/garmin/authorize?state=s',
    );
  });

  it('ends on the callback with an error when api. fails', async () => {
    serverApiFetch.mockResolvedValue(new Response('{}', { status: 500 }));
    const { GET } = await import('./route');
    const response = await GET(new NextRequest('https://sharpit.app/connect/garmin/start'));

    expect(response.headers.get('location')).toBe(
      'https://sharpit.app/connect/garmin/callback?garmin=error',
    );
  });
});
