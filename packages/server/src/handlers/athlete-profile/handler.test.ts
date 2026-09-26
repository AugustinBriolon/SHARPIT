import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
vi.mock('@sharpit/server/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));
vi.mock('@sharpit/server/lib/queries', () => ({
  getAthleteProfile: vi
    .fn()
    .mockResolvedValue({ id: 'athlete-1', displayMode: 'essential', tier: 'PRO' }),
  upsertAthleteProfile: vi.fn(),
}));

async function get(headers: Record<string, string> = {}) {
  const { GET } = await import('./handler');
  return GET(new NextRequest('https://sharpit.app/api/athlete-profile', { headers }));
}

describe('GET /api/athlete-profile', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('gives the web session its tier cookie', async () => {
    const response = await get({ cookie: '__session=web' });
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('sharpit.access-tier=PRO');
  });

  it('never sets a cookie for a Bearer client, the tier stays in the body', async () => {
    const response = await get({ authorization: 'Bearer token' });
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect((await response.json()).tier).toBe('PRO');
  });
});
