import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries')>();
  return {
    ...actual,
    getActivitiesList: vi.fn().mockResolvedValue([]),
  };
});

vi.mock('@/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));

const isDemoSessionMock = vi.fn();
vi.mock('@/lib/demo/demo-session', () => ({
  isDemoSession: isDemoSessionMock,
}));

async function importRoute() {
  return await import('./route');
}

function getRequest(query = '') {
  return new NextRequest(`http://localhost/api/activities${query}`);
}

describe('GET /api/activities — demo sinceDays clamp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes sinceDays through unchanged for a real athlete', async () => {
    isDemoSessionMock.mockResolvedValue(false);
    const { getActivitiesList } = await import('@/lib/queries');
    const { GET } = await importRoute();

    await GET(getRequest('?sinceDays=30'));

    expect(getActivitiesList).toHaveBeenCalledWith(
      'athlete-1',
      expect.objectContaining({ sinceDays: 30 }),
    );
  });

  it('leaves an unbounded request unbounded for a real athlete', async () => {
    isDemoSessionMock.mockResolvedValue(false);
    const { getActivitiesList } = await import('@/lib/queries');
    const { GET } = await importRoute();

    await GET(getRequest());

    expect(getActivitiesList).toHaveBeenCalledWith(
      'athlete-1',
      expect.objectContaining({ sinceDays: undefined }),
    );
  });

  it('clamps an unbounded demo request to 7 days', async () => {
    isDemoSessionMock.mockResolvedValue(true);
    const { getActivitiesList } = await import('@/lib/queries');
    const { GET } = await importRoute();

    await GET(getRequest());

    expect(getActivitiesList).toHaveBeenCalledWith(
      'athlete-1',
      expect.objectContaining({ sinceDays: 7 }),
    );
  });

  it('clamps a demo request asking for more than 7 days down to 7', async () => {
    isDemoSessionMock.mockResolvedValue(true);
    const { getActivitiesList } = await import('@/lib/queries');
    const { GET } = await importRoute();

    await GET(getRequest('?sinceDays=30'));

    expect(getActivitiesList).toHaveBeenCalledWith(
      'athlete-1',
      expect.objectContaining({ sinceDays: 7 }),
    );
  });

  it('respects a demo request already asking for fewer than 7 days', async () => {
    isDemoSessionMock.mockResolvedValue(true);
    const { getActivitiesList } = await import('@/lib/queries');
    const { GET } = await importRoute();

    await GET(getRequest('?sinceDays=3'));

    expect(getActivitiesList).toHaveBeenCalledWith(
      'athlete-1',
      expect.objectContaining({ sinceDays: 3 }),
    );
  });
});
