import { beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  createTravelContext: vi.fn(),
  applyTravelContextToUpcomingSessions: vi.fn(),
  listRestrictionsOnDay: vi.fn(),
  listTravelsOverlapping: vi.fn(),
}));
const queries = vi.hoisted(() => ({
  createPlannedSession: vi.fn(),
  createBrickSessions: vi.fn(),
  deletePlannedSession: vi.fn(),
  getPlannedSessionById: vi.fn(),
  updatePlannedSession: vi.fn(),
}));

vi.mock('next/server', () => ({ after: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/travel-context/service', () => service);
vi.mock('@/lib/queries', () => ({
  ...queries,
  getActiveTrainingPlan: vi.fn().mockResolvedValue(null),
  getGoals: vi.fn().mockResolvedValue([]),
  getGoalById: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/lib/integrations/google/google-sync', () => ({
  deleteSessionFromGoogle: vi.fn(),
  pushBrickToGoogleInBackground: vi.fn(),
  pushSessionToGoogleInBackground: vi.fn(),
}));
vi.mock('@/lib/planned-session/resolve-context', () => ({
  refreshAndPersistPlannedSessionContext: vi.fn(),
}));

import {
  executeCreateBrickSessionTool,
  executeCreatePlannedSessionTool,
  executeSetTravelContextTool,
  executeUpdatePlannedSessionTool,
} from './coach-tools-executors';

const ATHLETE = 'athlete-1';

/** A weekend trip where the athlete declared Course + Mobilité only. */
const joigny = {
  id: 'travel-1',
  label: 'Week-end Joigny',
  locationLabel: 'Joigny',
  startDate: new Date('2026-09-19T00:00:00.000Z'),
  endDate: new Date('2026-09-20T00:00:00.000Z'),
  trainingConstraint: 'FULL' as const,
  allowedDisciplines: ['RUN', 'MOBILITY'] as const,
};

const strengthSet = {
  exercise: 'Tractions lestées',
  intent: 'STRENGTH' as const,
  order: 0,
  sets: 3,
  reps: 8,
};

beforeEach(() => {
  vi.clearAllMocks();
  service.listRestrictionsOnDay.mockResolvedValue([joigny]);
  service.listTravelsOverlapping.mockResolvedValue([]);
});

describe('executeCreatePlannedSessionTool under a declared travel', () => {
  it('refuses a strength session and never writes it', async () => {
    const result = await executeCreatePlannedSessionTool(ATHLETE, {
      type: 'STRENGTH',
      date: '2026-09-19',
      title: 'Renfo',
      strengthPrescription: { sets: [strengthSet] },
    } as never);

    expect(result).toMatchObject({ ok: false });
    expect(queries.createPlannedSession).not.toHaveBeenCalled();
  });

  it('tells the coach the sports to use instead', async () => {
    const result = await executeCreatePlannedSessionTool(ATHLETE, {
      type: 'BIKE',
      date: '2026-09-19',
      title: 'Sortie vélo',
    } as never);

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('Course') });
  });

  it('lets a sport the athlete declared through', async () => {
    queries.createPlannedSession.mockResolvedValue({ id: 'ps-1' });

    const result = await executeCreatePlannedSessionTool(ATHLETE, {
      type: 'RUN',
      date: '2026-09-19',
      title: 'Sortie longue',
    } as never);

    expect(result).toMatchObject({ ok: true, id: 'ps-1' });
  });
});

describe('executeUpdatePlannedSessionTool under a declared travel', () => {
  const existing = {
    id: 'ps-1',
    date: new Date('2026-09-18T00:00:00.000Z'),
    type: 'STRENGTH',
    strengthPrescription: { version: 1, sets: [strengthSet] },
  };

  beforeEach(() => {
    queries.getPlannedSessionById.mockResolvedValue(existing);
  });

  it('refuses moving a strength session onto a travel day', async () => {
    const result = await executeUpdatePlannedSessionTool(ATHLETE, {
      id: 'ps-1',
      date: '2026-09-19',
    });

    expect(result).toMatchObject({ ok: false });
    expect(queries.updatePlannedSession).not.toHaveBeenCalled();
  });

  it('does not re-validate an edit that touches neither day, sport nor prescription', async () => {
    queries.getPlannedSessionById.mockResolvedValue({
      ...existing,
      date: new Date('2026-09-19T00:00:00.000Z'),
    });
    queries.updatePlannedSession.mockResolvedValue({ ...existing, title: 'Renommée' });

    const result = await executeUpdatePlannedSessionTool(ATHLETE, {
      id: 'ps-1',
      title: 'Renommée',
    });

    expect(result).toMatchObject({ ok: true });
    expect(service.listRestrictionsOnDay).not.toHaveBeenCalled();
  });
});

describe('executeCreateBrickSessionTool under a declared travel', () => {
  it('refuses a brick with a leg outside the declared sports', async () => {
    const result = await executeCreateBrickSessionTool(ATHLETE, {
      date: '2026-09-19',
      legs: [
        { type: 'RUN', title: 'Course' },
        { type: 'BIKE', title: 'Vélo' },
      ],
    });

    expect(result).toMatchObject({ ok: false });
    expect(queries.createBrickSessions).not.toHaveBeenCalled();
  });
});

describe('executeSetTravelContextTool when a travel already exists', () => {
  const request = {
    locationLabel: 'Joigny',
    startDate: '2026-09-19',
    endDate: '2026-09-20',
    allowedDisciplines: ['RUN', 'STRENGTH', 'MOBILITY'] as Array<'RUN' | 'STRENGTH' | 'MOBILITY'>,
  };

  it('returns the existing travel instead of creating a duplicate', async () => {
    service.listTravelsOverlapping.mockResolvedValue([joigny]);

    const result = await executeSetTravelContextTool(ATHLETE, request);

    expect(result).toMatchObject({
      ok: false,
      existing: [{ id: 'travel-1', allowedDisciplines: ['RUN', 'MOBILITY'] }],
    });
    expect(service.createTravelContext).not.toHaveBeenCalled();
  });

  it('creates the travel when nothing is declared on those dates', async () => {
    service.createTravelContext.mockResolvedValue({ id: 'travel-2', locationLabel: 'Joigny' });
    service.applyTravelContextToUpcomingSessions.mockResolvedValue(0);

    const result = await executeSetTravelContextTool(ATHLETE, request);

    expect(result).toMatchObject({ ok: true, travelId: 'travel-2' });
  });
});
