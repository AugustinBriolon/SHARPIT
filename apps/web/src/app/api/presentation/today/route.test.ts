import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));

vi.mock('@/lib/morning-recalibration/service', () => ({
  getMorningRecalibrationPresentation: vi.fn(),
  ensureMorningRecalibration: vi.fn(),
}));

vi.mock('@/lib/presentation/today/today', () => ({
  buildTodayPresentationViewModel: vi.fn(),
}));

async function importRoute() {
  return await import('./route');
}

describe('GET /api/presentation/today', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is read-only: loads existing morning recalibration without ensure', async () => {
    const { getMorningRecalibrationPresentation, ensureMorningRecalibration } =
      await import('@/lib/morning-recalibration/service');
    const { buildTodayPresentationViewModel } = await import('@/lib/presentation/today/today');
    vi.mocked(getMorningRecalibrationPresentation).mockResolvedValue(null);
    vi.mocked(buildTodayPresentationViewModel).mockResolvedValue({ headline: 'ok' } as never);

    const { GET } = await importRoute();
    const response = await GET(
      new NextRequest('http://localhost/api/presentation/today?trainingDayId=2026-09-10'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.viewModel).toEqual({ headline: 'ok' });
    expect(getMorningRecalibrationPresentation).toHaveBeenCalledWith('athlete-1', '2026-09-10');
    expect(ensureMorningRecalibration).not.toHaveBeenCalled();
  });

  it('rejects invalid trainingDayId', async () => {
    const { GET } = await importRoute();
    const response = await GET(
      new NextRequest('http://localhost/api/presentation/today?trainingDayId=nope'),
    );
    expect(response.status).toBe(400);
  });
});
