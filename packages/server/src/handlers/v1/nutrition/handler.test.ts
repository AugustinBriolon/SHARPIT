import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@sharpit/server/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));
vi.mock('@sharpit/db/client', () => ({
  prisma: { dailyNutrition: { findMany: vi.fn().mockResolvedValue([]) } },
}));
const isProAthlete = vi.fn();
vi.mock('@sharpit/server/lib/access/is-pro-athlete', () => ({ isProAthlete }));
const buildNutritionViewModel = vi.fn();
vi.mock('@sharpit/server/lib/presentation/nutrition/nutrition', () => ({
  buildNutritionViewModel,
}));
const prepareNutritionCoachReading = vi.fn();
vi.mock('@sharpit/server/lib/nutrition/analysis/nutrition-analysis', () => ({
  prepareNutritionCoachReading,
}));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: vi.fn(),
}));

const request = (query: string) =>
  new NextRequest(`https://api.sharpit.app/api/v1/nutrition${query}`);

describe('GET /api/v1/nutrition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isProAthlete.mockResolvedValue(true);
    prepareNutritionCoachReading.mockResolvedValue({ view: { state: 'pending' }, generate: null });
    buildNutritionViewModel.mockResolvedValue({
      connected: true,
      diet: { ids: [], labels: [] },
      coachReading: null,
      selectedDay: null,
      today: null,
      history: [],
      emptyState: { title: 'Aucune donnée ce jour-là', description: 'Rien ce jour.' },
    });
  });

  it('requires a training day', async () => {
    const { GET } = await import('./handler');
    expect((await GET(request(''))).status).toBe(400);
    expect((await GET(request('?trainingDayId=27-09-2026'))).status).toBe(400);
  });

  it('serves the log to everyone and keeps the coach reading for Pro', async () => {
    isProAthlete.mockResolvedValue(false);
    const { GET } = await import('./handler');
    const response = await GET(request('?trainingDayId=2026-09-27'));
    expect(response.status).toBe(200);
    expect(buildNutritionViewModel).toHaveBeenCalledWith('athlete-1', '2026-09-27');
    expect(prepareNutritionCoachReading).not.toHaveBeenCalled();
    expect((await response.json()).coachReading).toEqual({ state: 'pro_required' });
  });

  it('returns the day with the coach reading for a Pro athlete', async () => {
    const { GET } = await import('./handler');
    const response = await GET(request('?trainingDayId=2026-09-27'));
    expect(response.status).toBe(200);
    expect(buildNutritionViewModel).toHaveBeenCalledWith('athlete-1', '2026-09-27');
    const body = await response.json();
    expect(body).toMatchObject({
      apiVersion: 1,
      trainingDayId: '2026-09-27',
      connected: true,
      day: null,
      empty: { title: 'Aucune donnée ce jour-là', message: 'Rien ce jour.' },
      coachReading: { state: 'pending' },
    });
    expect(body.history).toHaveLength(14);
    expect(body.regularity).toEqual({ days: 14, logged: 0, onTarget: 0 });
  });
});
