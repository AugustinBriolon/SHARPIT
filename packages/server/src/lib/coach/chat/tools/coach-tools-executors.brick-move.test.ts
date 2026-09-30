import { beforeEach, describe, expect, it, vi } from 'vitest';

const queries = vi.hoisted(() => ({
  getPlannedSessionById: vi.fn(),
  updatePlannedSession: vi.fn(),
  getBrickSessions: vi.fn(),
  rescheduleBrickSessions: vi.fn(),
}));
const google = vi.hoisted(() => ({
  deleteSessionFromGoogle: vi.fn(),
  pushBrickToGoogleInBackground: vi.fn(),
  pushSessionToGoogleInBackground: vi.fn(),
}));
const service = vi.hoisted(() => ({
  createTravelContext: vi.fn(),
  applyTravelContextToUpcomingSessions: vi.fn(),
  listRestrictionsOnDay: vi.fn(),
  listTravelsOverlapping: vi.fn(),
}));

vi.mock('next/server', () => ({ after: vi.fn() }));
vi.mock('@sharpit/db/client', () => ({ prisma: {} }));
vi.mock('@sharpit/server/lib/travel-context/service', () => service);
vi.mock('@sharpit/server/lib/queries', () => ({
  ...queries,
  createPlannedSession: vi.fn(),
  createBrickSessions: vi.fn(),
  deletePlannedSession: vi.fn(),
  getActiveTrainingPlan: vi.fn().mockResolvedValue(null),
  getGoals: vi.fn().mockResolvedValue([]),
  getGoalById: vi.fn().mockResolvedValue(null),
}));
vi.mock('@sharpit/server/lib/integrations/google/google-sync', () => google);
vi.mock('@sharpit/server/lib/planned-session/resolve-context', () => ({
  refreshAndPersistPlannedSessionContext: vi.fn(),
}));

import { executeUpdatePlannedSessionTool } from './coach-tools-executors';

const ATHLETE = 'athlete-1';

function session(overrides: Record<string, unknown>) {
  return {
    id: 'ps-1',
    athleteId: ATHLETE,
    date: new Date('2026-10-01T12:00:00'),
    startTime: '12:00',
    type: 'BIKE',
    title: 'Vélo',
    durationMin: 85,
    brickGroupId: null,
    brickOrder: null,
    strengthPrescription: null,
    endurancePrescription: null,
    ...overrides,
  };
}

const bikeLeg = session({ id: 'leg-bike', brickGroupId: 'group-1', brickOrder: 0 });
const runLeg = session({
  id: 'leg-run',
  type: 'RUN',
  title: 'Course',
  durationMin: 30,
  startTime: '13:25',
  brickGroupId: 'group-1',
  brickOrder: 1,
});

beforeEach(() => {
  vi.clearAllMocks();
  service.listRestrictionsOnDay.mockResolvedValue([]);
  queries.getBrickSessions.mockResolvedValue([bikeLeg, runLeg]);
  queries.updatePlannedSession.mockImplementation(async (_a: string, id: string) =>
    id === 'leg-bike' ? bikeLeg : session({ id }),
  );
});

describe('executeUpdatePlannedSessionTool · brick legs', () => {
  it('moves every leg of the brick when one leg changes day', async () => {
    queries.getPlannedSessionById.mockResolvedValue(bikeLeg);
    const moved = [
      { ...bikeLeg, date: new Date('2026-09-30T12:00:00') },
      { ...runLeg, date: new Date('2026-09-30T12:00:00') },
    ];
    queries.rescheduleBrickSessions.mockResolvedValue(moved);

    const result = await executeUpdatePlannedSessionTool(ATHLETE, {
      id: 'leg-bike',
      date: '2026-09-30',
    });

    expect(queries.rescheduleBrickSessions).toHaveBeenCalledWith(ATHLETE, 'group-1', {
      date: new Date('2026-09-30T12:00:00'),
      startTime: undefined,
    });
    expect(result).toMatchObject({
      ok: true,
      date: '2026-09-30',
      brickLegsMoved: [
        { id: 'leg-bike', date: '2026-09-30' },
        { id: 'leg-run', date: '2026-09-30' },
      ],
    });
    expect(google.pushBrickToGoogleInBackground).toHaveBeenCalledWith(moved);
    expect(google.pushSessionToGoogleInBackground).not.toHaveBeenCalled();
  });

  it('restarts the brick at a new time', async () => {
    queries.getPlannedSessionById.mockResolvedValue(runLeg);
    queries.rescheduleBrickSessions.mockResolvedValue([bikeLeg, runLeg]);

    await executeUpdatePlannedSessionTool(ATHLETE, { id: 'leg-run', startTime: '11:30' });

    expect(queries.rescheduleBrickSessions).toHaveBeenCalledWith(ATHLETE, 'group-1', {
      date: undefined,
      startTime: '11:30',
    });
  });

  it('refuses the move when a travel forbids another leg’s sport on the new day', async () => {
    queries.getPlannedSessionById.mockResolvedValue(bikeLeg);
    service.listRestrictionsOnDay.mockResolvedValue([
      {
        id: 'travel-1',
        label: 'Déplacement',
        locationLabel: 'Lyon',
        startDate: new Date('2026-09-30T00:00:00.000Z'),
        endDate: new Date('2026-09-30T00:00:00.000Z'),
        trainingConstraint: 'FULL',
        allowedDisciplines: ['BIKE'],
      },
    ]);

    const result = await executeUpdatePlannedSessionTool(ATHLETE, {
      id: 'leg-bike',
      date: '2026-09-30',
    });

    expect(result).toMatchObject({ ok: false });
    expect(queries.updatePlannedSession).not.toHaveBeenCalled();
    expect(queries.rescheduleBrickSessions).not.toHaveBeenCalled();
  });

  it('leaves the other legs alone when only the leg’s content changes', async () => {
    queries.getPlannedSessionById.mockResolvedValue(bikeLeg);

    const result = await executeUpdatePlannedSessionTool(ATHLETE, {
      id: 'leg-bike',
      title: 'Vélo seuil',
    });

    expect(queries.rescheduleBrickSessions).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty('brickLegsMoved');
    expect(google.pushSessionToGoogleInBackground).toHaveBeenCalled();
  });

  it('moves a session that is no brick leg by itself', async () => {
    queries.getPlannedSessionById.mockResolvedValue(session({ id: 'swim', type: 'SWIM' }));

    await executeUpdatePlannedSessionTool(ATHLETE, { id: 'swim', date: '2026-10-01' });

    expect(queries.getBrickSessions).not.toHaveBeenCalled();
    expect(queries.rescheduleBrickSessions).not.toHaveBeenCalled();
  });
});
