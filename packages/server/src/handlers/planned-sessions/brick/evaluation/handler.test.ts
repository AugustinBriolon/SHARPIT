import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
vi.mock('@sharpit/server/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));
vi.mock('@sharpit/server/lib/queries', () => ({
  getBrickEvaluation: vi.fn(),
  getBrickSessions: vi.fn(),
  setBrickEvaluation: vi.fn(),
}));

const URL = 'https://sharpit.app/api/planned-sessions/brick/evaluation';

async function put(body: unknown) {
  const { PUT } = await import('./handler');
  return PUT(new NextRequest(URL, { method: 'PUT', body: JSON.stringify(body) }));
}

describe('/api/planned-sessions/brick/evaluation', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const queries = await import('@sharpit/server/lib/queries');
    vi.mocked(queries.getBrickSessions).mockResolvedValue([{ id: 'bike' }, { id: 'run' }] as never);
    vi.mocked(queries.setBrickEvaluation).mockImplementation(
      async (athleteId, brickGroupId, fields) => ({ athleteId, brickGroupId, ...fields }) as never,
    );
  });

  it('reads the evaluation of the asked brick', async () => {
    const { GET } = await import('./handler');
    const { getBrickEvaluation } = await import('@sharpit/server/lib/queries');
    vi.mocked(getBrickEvaluation).mockResolvedValue({ brickGroupId: 'brick-1', rpe: 7 } as never);

    const response = await GET(new NextRequest(`${URL}?groupId=brick-1`));

    expect(getBrickEvaluation).toHaveBeenCalledWith('athlete-1', 'brick-1');
    expect(await response.json()).toEqual({ evaluation: { brickGroupId: 'brick-1', rpe: 7 } });
  });

  it('asks for the group id on read', async () => {
    const { GET } = await import('./handler');
    expect((await GET(new NextRequest(URL))).status).toBe(400);
  });

  it('saves the fields the athlete filled in', async () => {
    const { setBrickEvaluation } = await import('@sharpit/server/lib/queries');

    const response = await put({ brickGroupId: 'brick-1', rpe: 8, transitionRating: 3 });

    expect(response.status).toBe(200);
    expect(setBrickEvaluation).toHaveBeenCalledWith('athlete-1', 'brick-1', {
      rpe: 8,
      transitionRating: 3,
    });
  });

  it('refuses a rating off its scale', async () => {
    const { setBrickEvaluation } = await import('@sharpit/server/lib/queries');

    expect((await put({ brickGroupId: 'brick-1', transitionRating: 9 })).status).toBe(400);
    expect(setBrickEvaluation).not.toHaveBeenCalled();
  });

  it('refuses a brick the athlete does not own', async () => {
    const queries = await import('@sharpit/server/lib/queries');
    vi.mocked(queries.getBrickSessions).mockResolvedValue([]);

    expect((await put({ brickGroupId: 'someone-else', rpe: 5 })).status).toBe(404);
    expect(queries.setBrickEvaluation).not.toHaveBeenCalled();
  });
});
