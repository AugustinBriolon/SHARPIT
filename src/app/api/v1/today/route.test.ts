import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));

vi.mock('@/lib/morning-recalibration/service', () => ({
  getMorningRecalibrationPresentation: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/presentation/today/today', () => ({
  buildTodayPresentationViewModel: vi.fn(),
}));

vi.mock('@/lib/presentation/v1/today', () => ({
  projectV1TodayFromViewModel: vi.fn().mockReturnValue({
    apiVersion: 1,
    trainingDayId: '2026-09-10',
    empty: null,
    verdict: {
      eyebrow: '',
      headline: 'ok',
      subline: '',
      posture: 'steady',
      confidencePct: null,
      limitingCause: null,
    },
    weather: null,
    sessions: [],
    signals: [],
  }),
}));

async function importRoute() {
  return await import('./route');
}

describe('GET /api/v1/today', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a missing trainingDayId', async () => {
    const { GET } = await importRoute();
    const response = await GET(new NextRequest('http://localhost/api/v1/today'));
    expect(response.status).toBe(400);
  });

  it('returns projected v1 JSON, not viewModel', async () => {
    const { buildTodayPresentationViewModel } = await import('@/lib/presentation/today/today');
    vi.mocked(buildTodayPresentationViewModel).mockResolvedValue({} as never);
    const { GET } = await importRoute();
    const response = await GET(
      new NextRequest('http://localhost/api/v1/today?trainingDayId=2026-09-10'),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.apiVersion).toBe(1);
    expect(body.viewModel).toBeUndefined();
  });
});
