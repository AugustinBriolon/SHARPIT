import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const afterMock = vi.fn();

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (task: () => Promise<void>) => afterMock(task),
}));

vi.mock('@/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));

vi.mock('@/lib/presentation/nutrition/nutrition', () => ({
  buildNutritionViewModel: vi.fn(),
}));

vi.mock('@/lib/nutrition/analysis/nutrition-analysis', () => ({
  prepareNutritionCoachReading: vi.fn(),
}));

const VIEW_MODEL = {
  connected: true,
  diet: { ids: [], labels: [] },
  coachReading: null,
  selectedDay: null,
  today: null,
  history: [],
  emptyState: null,
};

function request(query: string) {
  return new NextRequest(`http://localhost/api/presentation/nutrition?${query}`);
}

async function mocks() {
  const { buildNutritionViewModel } = await import('@/lib/presentation/nutrition/nutrition');
  const { prepareNutritionCoachReading } =
    await import('@/lib/nutrition/analysis/nutrition-analysis');
  vi.mocked(buildNutritionViewModel).mockResolvedValue(VIEW_MODEL);
  return { prepare: vi.mocked(prepareNutritionCoachReading) };
}

describe('GET /api/presentation/nutrition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('answers pending and schedules the generation after the response', async () => {
    const { prepare } = await mocks();
    const generate = vi.fn().mockResolvedValue(undefined);
    prepare.mockResolvedValue({ view: { state: 'pending' }, generate });

    const { GET } = await import('./route');
    const response = await GET(request('trainingDayId=2026-09-10'));

    expect(await response.json()).toEqual({
      viewModel: { ...VIEW_MODEL, coachReading: { state: 'pending' } },
    });
    expect(prepare).toHaveBeenCalledWith('athlete-1', '2026-09-10');
    expect(afterMock).toHaveBeenCalledWith(generate);
    expect(generate).not.toHaveBeenCalled();
  });

  it('schedules nothing when the reading is already stored', async () => {
    const { prepare } = await mocks();
    prepare.mockResolvedValue({ view: { state: 'awaiting_day_end' }, generate: null });

    const { GET } = await import('./route');
    await GET(request('trainingDayId=2026-09-11'));

    expect(afterMock).not.toHaveBeenCalled();
  });

  it('keeps the page when the coach reading fails', async () => {
    const { prepare } = await mocks();
    prepare.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { GET } = await import('./route');
    const response = await GET(request('trainingDayId=2026-09-10'));

    expect(response.status).toBe(200);
    expect((await response.json()).viewModel.coachReading).toBeNull();
  });
});
