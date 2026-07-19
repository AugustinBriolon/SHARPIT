import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/queries', () => ({
  getActiveTrainingPlan: vi.fn(),
  getGoals: vi.fn(),
  getPlannedSessions: vi.fn(),
  getActivitiesList: vi.fn(),
}));

vi.mock('@/lib/decision-memory/repository', () => ({
  findDecisionForPlannedSession: vi.fn().mockResolvedValue(null),
  findRecentEvaluatedOutcomes: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/athlete-state/snapshot-service', () => ({
  getOrBuildAthleteSnapshot: vi.fn(),
}));

async function importRoute() {
  return await import('./route');
}

function request(weekStart?: string) {
  const url = weekStart
    ? `http://localhost/api/presentation/weekly-coaching-brief?weekStart=${weekStart}`
    : 'http://localhost/api/presentation/weekly-coaching-brief';
  return new NextRequest(url);
}

describe('GET /api/presentation/weekly-coaching-brief', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    await importRoute();
  });

  it('degraded path: nothing configured produces the empty-state shape', async () => {
    const { getActiveTrainingPlan, getGoals, getPlannedSessions, getActivitiesList } =
      await import('@/lib/queries');
    const { getOrBuildAthleteSnapshot } = await import('@/lib/athlete-state/snapshot-service');
    vi.mocked(getActiveTrainingPlan).mockResolvedValue(null);
    vi.mocked(getGoals).mockResolvedValue([]);
    vi.mocked(getPlannedSessions).mockResolvedValue([]);
    vi.mocked(getActivitiesList).mockResolvedValue([]);
    vi.mocked(getOrBuildAthleteSnapshot).mockResolvedValue({ decision: null } as never);

    const { GET } = await importRoute();
    const response = await GET(request('2026-07-13'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.viewModel.visible).toBe(true);
    expect(body.viewModel.emptyState).not.toBeNull();
    expect(body.viewModel.planContext).toBeNull();
  });

  it('happy path: active plan + sessions produce a populated brief', async () => {
    const { getActiveTrainingPlan, getGoals, getPlannedSessions, getActivitiesList } =
      await import('@/lib/queries');
    const { getOrBuildAthleteSnapshot } = await import('@/lib/athlete-state/snapshot-service');
    vi.mocked(getActiveTrainingPlan).mockResolvedValue({
      weeks: [
        {
          weekStart: new Date('2026-07-13T00:00:00.000Z'),
          phase: 'BUILD',
          targetLoad: 450,
          isDeload: false,
          focus: null,
        },
      ],
    } as never);
    vi.mocked(getGoals).mockResolvedValue([]);
    vi.mocked(getPlannedSessions).mockResolvedValue([
      {
        id: 'session-1',
        date: new Date('2026-07-14T08:00:00.000Z'),
        type: 'RUN',
        intensity: 'THRESHOLD',
        durationMin: 45,
        load: 60,
      },
    ] as never);
    vi.mocked(getActivitiesList).mockResolvedValue([]);
    vi.mocked(getOrBuildAthleteSnapshot).mockResolvedValue({ decision: null } as never);

    const { GET } = await importRoute();
    const response = await GET(request('2026-07-13'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.viewModel.emptyState).toBeNull();
    expect(body.viewModel.planContext.targetLoad).toBe(450);
    expect(body.viewModel.keySessions).toHaveLength(1);
  });
});
