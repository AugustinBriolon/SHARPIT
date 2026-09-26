import { beforeEach, describe, expect, it, vi } from 'vitest';

const getActivityRoutePreviewsMock = vi.fn();

vi.mock('@sharpit/server/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));

vi.mock('@sharpit/server/lib/streams/route-previews', () => ({
  getActivityRoutePreviews: (...args: unknown[]) => getActivityRoutePreviewsMock(...args),
}));

describe('GET /api/activities/route-previews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cache-only previews for the current athlete', async () => {
    getActivityRoutePreviewsMock.mockResolvedValue({
      'act-1': [
        [48.8, 2.3],
        [48.81, 2.31],
      ],
    });
    const { GET } = await import('./handler');
    const res = await GET();
    const body = await res.json();

    expect(getActivityRoutePreviewsMock).toHaveBeenCalledWith('athlete-1');
    expect(res.status).toBe(200);
    expect(body).toEqual({
      'act-1': [
        [48.8, 2.3],
        [48.81, 2.31],
      ],
    });
  });
});
