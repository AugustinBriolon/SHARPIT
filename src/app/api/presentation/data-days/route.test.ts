import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/presentation/data-days-server', () => ({
  loadDataDays: vi.fn(),
}));

vi.mock('@/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));

async function importRoute() {
  return await import('./route');
}

function request(query: string) {
  return new NextRequest(`http://localhost/api/presentation/data-days?${query}`);
}

describe('GET /api/presentation/data-days', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the days with data for the athlete', async () => {
    const { loadDataDays } = await import('@/lib/presentation/data-days-server');
    vi.mocked(loadDataDays).mockResolvedValue(['2026-09-09', '2026-09-10']);

    const { GET } = await importRoute();
    const response = await GET(request('domain=sleep&from=2026-08-15&to=2026-09-11'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ days: ['2026-09-09', '2026-09-10'] });
    expect(loadDataDays).toHaveBeenCalledWith('athlete-1', {
      domain: 'sleep',
      from: '2026-08-15',
      to: '2026-09-11',
    });
  });

  it('rejects an invalid request without touching the database', async () => {
    const { loadDataDays } = await import('@/lib/presentation/data-days-server');

    const { GET } = await importRoute();
    const response = await GET(request('domain=sleep&from=2026-09-11&to=2026-08-15'));

    expect(response.status).toBe(400);
    expect(loadDataDays).not.toHaveBeenCalled();
  });

  it('returns 500 when loading fails', async () => {
    const { loadDataDays } = await import('@/lib/presentation/data-days-server');
    vi.mocked(loadDataDays).mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { GET } = await importRoute();
    const response = await GET(request('domain=effort&from=2026-08-15&to=2026-09-11'));

    expect(response.status).toBe(500);
  });
});
