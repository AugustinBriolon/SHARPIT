import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));

vi.mock('@/lib/next/await-request', () => ({
  awaitRequest: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/analysis/analysis-run-store', () => ({
  listRecentAnalysisRuns: vi.fn(),
}));

const RUN = {
  kind: 'ACTIVITY_NARRATIVE' as const,
  targetId: 'activity-1',
  status: 'READY' as const,
  startedAt: '2026-09-12T09:58:00.000Z',
  finishedAt: '2026-09-12T09:59:00.000Z',
};

describe('GET /api/analyses/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the athlete’s recent and in-flight runs', async () => {
    const { listRecentAnalysisRuns } = await import('@/lib/analysis/analysis-run-store');
    vi.mocked(listRecentAnalysisRuns).mockResolvedValue([RUN]);

    const { GET } = await import('./route');
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ runs: [RUN], pending: 0 });
    expect(listRecentAnalysisRuns).toHaveBeenCalledWith('athlete-1');
  });

  it('counts what the athlete is still waiting on', async () => {
    const { listRecentAnalysisRuns } = await import('@/lib/analysis/analysis-run-store');
    vi.mocked(listRecentAnalysisRuns).mockResolvedValue([
      { ...RUN, status: 'RUNNING', finishedAt: null, startedAt: new Date().toISOString() },
    ]);

    const { GET } = await import('./route');
    const body = await (await GET()).json();

    expect(body.pending).toBe(1);
  });

  it('never takes the app down when the store fails', async () => {
    const { listRecentAnalysisRuns } = await import('@/lib/analysis/analysis-run-store');
    vi.mocked(listRecentAnalysisRuns).mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { GET } = await import('./route');
    const response = await GET();

    expect(response.status).toBe(500);
  });
});
