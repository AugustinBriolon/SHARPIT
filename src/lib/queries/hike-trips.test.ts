import { ActivityType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateMany = vi.fn();
const mockDelete = vi.fn();
const mockTransaction = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    activity: {
      findMany: mockFindMany,
      updateMany: mockUpdateMany,
    },
    hikeTrip: {
      findUnique: mockFindUnique,
      findMany: vi.fn(),
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
    $transaction: mockTransaction,
  },
}));

function hikeActivity(
  id: string,
  overrides: Partial<{
    hikeTripId: string | null;
    hikeTrip: { id: string; name: string } | null;
  }> = {},
) {
  return {
    id,
    type: ActivityType.HIKE,
    date: new Date('2026-08-01'),
    title: `Hike ${id}`,
    duration: 3600,
    load: 50,
    observedLocationLabel: 'Chamonix',
    hikeMetrics: { distanceM: 10000, elevationM: 500, elevationLossM: 200 },
    hikeTripId: overrides.hikeTripId ?? null,
    hikeTrip: overrides.hikeTrip ?? null,
  };
}

describe('createHikeTrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        hikeTrip: { create: mockCreate },
        activity: { updateMany: mockUpdateMany },
      }),
    );
  });

  it('creates a trip and links hike activities', async () => {
    const { createHikeTrip } = await import('@/lib/queries/hike-trips');

    mockFindMany.mockResolvedValueOnce([hikeActivity('a1'), hikeActivity('a2')]);
    mockCreate.mockResolvedValueOnce({
      id: 'trip-1',
      name: 'Week-end',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockFindUnique.mockResolvedValueOnce({
      id: 'trip-1',
      name: 'Week-end',
      createdAt: new Date(),
      updatedAt: new Date(),
      activities: [hikeActivity('a1'), hikeActivity('a2')],
    });

    const result = await createHikeTrip({ name: 'Week-end', activityIds: ['a1', 'a2'] });

    expect(mockCreate).toHaveBeenCalledWith({ data: { name: 'Week-end' } });
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a1', 'a2'] } },
      data: { hikeTripId: 'trip-1' },
    });
    expect(result.id).toBe('trip-1');
    expect(result.activities).toHaveLength(2);
  });

  it('throws when duplicate activity ids collapse below two members', async () => {
    const { createHikeTrip, HikeTripValidationError } = await import('@/lib/queries/hike-trips');

    await expect(
      createHikeTrip({ name: 'Week-end', activityIds: ['a1', 'a1'] }),
    ).rejects.toBeInstanceOf(HikeTripValidationError);

    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('throws when an activity is missing', async () => {
    const { createHikeTrip, HikeTripValidationError } = await import('@/lib/queries/hike-trips');

    mockFindMany.mockResolvedValueOnce([hikeActivity('a1')]);

    await expect(
      createHikeTrip({ name: 'Week-end', activityIds: ['a1', 'a2'] }),
    ).rejects.toBeInstanceOf(HikeTripValidationError);
  });

  it('throws when an activity is not a hike', async () => {
    const { createHikeTrip, HikeTripValidationError } = await import('@/lib/queries/hike-trips');

    mockFindMany.mockResolvedValueOnce([
      hikeActivity('a1'),
      { ...hikeActivity('a2'), type: ActivityType.RUN },
    ]);

    await expect(
      createHikeTrip({ name: 'Week-end', activityIds: ['a1', 'a2'] }),
    ).rejects.toBeInstanceOf(HikeTripValidationError);
  });

  it('throws conflict when an activity is already linked', async () => {
    const { createHikeTrip, HikeTripConflictError } = await import('@/lib/queries/hike-trips');

    mockFindMany.mockResolvedValueOnce([
      hikeActivity('a1'),
      hikeActivity('a2', {
        hikeTripId: 'other-trip',
        hikeTrip: { id: 'other-trip', name: 'Autre dossier' },
      }),
    ]);

    await expect(
      createHikeTrip({ name: 'Week-end', activityIds: ['a1', 'a2'] }),
    ).rejects.toMatchObject({
      name: 'HikeTripConflictError',
      tripId: 'other-trip',
      tripName: 'Autre dossier',
    });
  });
});

describe('updateHikeTrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        hikeTrip: { update: mockUpdate },
        activity: { updateMany: mockUpdateMany },
      }),
    );
  });

  it('allows removing a member when add ids are already in the trip', async () => {
    const { updateHikeTrip } = await import('@/lib/queries/hike-trips');

    mockFindUnique
      .mockResolvedValueOnce({
        id: 'trip-1',
        name: 'Duo',
        createdAt: new Date(),
        updatedAt: new Date(),
        activities: [hikeActivity('a1'), hikeActivity('a2')],
      })
      .mockResolvedValueOnce({
        id: 'trip-1',
        name: 'Duo',
        createdAt: new Date(),
        updatedAt: new Date(),
        activities: [hikeActivity('a2')],
      });
    mockFindMany.mockResolvedValueOnce([hikeActivity('a2', { hikeTripId: 'trip-1' })]);

    const result = await updateHikeTrip('trip-1', {
      removeActivityIds: ['a1'],
      addActivityIds: ['a2'],
    });

    expect(result.activities).toHaveLength(1);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a1'] }, hikeTripId: 'trip-1' },
      data: { hikeTripId: null },
    });
  });

  it('blocks removing the last member', async () => {
    const { updateHikeTrip, HikeTripValidationError } = await import('@/lib/queries/hike-trips');

    mockFindUnique.mockResolvedValueOnce({
      id: 'trip-1',
      name: 'Solo',
      createdAt: new Date(),
      updatedAt: new Date(),
      activities: [hikeActivity('a1')],
    });

    await expect(updateHikeTrip('trip-1', { removeActivityIds: ['a1'] })).rejects.toBeInstanceOf(
      HikeTripValidationError,
    );
  });
});

describe('deleteHikeTrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        activity: { updateMany: mockUpdateMany },
        hikeTrip: { delete: mockDelete },
      }),
    );
  });

  it('unlinks members then deletes the trip', async () => {
    const { deleteHikeTrip } = await import('@/lib/queries/hike-trips');

    mockFindUnique.mockResolvedValueOnce({ id: 'trip-1' });

    await deleteHikeTrip('trip-1');

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { hikeTripId: 'trip-1' },
      data: { hikeTripId: null },
    });
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'trip-1' } });
  });
});
