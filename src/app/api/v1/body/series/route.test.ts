import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));
const loadBodySeriesInputs = vi.fn();
vi.mock('@/lib/body/body-v1-data', () => ({ loadBodySeriesInputs }));

const request = (query: string) =>
  new NextRequest(`https://sharpit.app/api/v1/body/series${query}`);

describe('GET /api/v1/body/series', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadBodySeriesInputs.mockResolvedValue({
      composition: [],
      daily: [],
      dailySource: 'garmin',
      profile: null,
      snapshots: [],
    });
  });

  it('rejects an unknown metric', async () => {
    const { GET } = await import('./route');
    expect((await GET(request('?metric=steps'))).status).toBe(400);
  });

  it('rejects an unknown range', async () => {
    const { GET } = await import('./route');
    expect((await GET(request('?metric=weight&range=2w'))).status).toBe(400);
  });

  it('loads the requested range and returns the v1 series', async () => {
    const { GET } = await import('./route');
    const response = await GET(request('?metric=weight&range=1y'));
    expect(response.status).toBe(200);
    expect(loadBodySeriesInputs).toHaveBeenCalledWith('athlete-1', '1y');
    expect(await response.json()).toEqual({
      apiVersion: 1,
      metric: 'weight',
      unit: 'kg',
      range: '1y',
      points: [],
    });
  });
});
