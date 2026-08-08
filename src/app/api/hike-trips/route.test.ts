import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries')>();
  return {
    ...actual,
    createHikeTrip: vi.fn(),
    listHikeTrips: vi.fn(),
  };
});

async function importRoute() {
  return await import('./route');
}

const TRIP = {
  id: 'trip-1',
  name: 'Pyrénées',
  createdAt: new Date('2026-08-01T10:00:00.000Z'),
  updatedAt: new Date('2026-08-01T10:00:00.000Z'),
  activities: [],
};

describe('GET /api/hike-trips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the trip list', async () => {
    const { listHikeTrips } = await import('@/lib/queries');
    vi.mocked(listHikeTrips).mockResolvedValue([{ ...TRIP, summary: {} as never }]);

    const { GET } = await importRoute();
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        ...TRIP,
        createdAt: TRIP.createdAt.toISOString(),
        updatedAt: TRIP.updatedAt.toISOString(),
        summary: {},
      },
    ]);
  });
});

describe('POST /api/hike-trips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a trip and returns 201', async () => {
    const { createHikeTrip } = await import('@/lib/queries');
    vi.mocked(createHikeTrip).mockResolvedValue(TRIP);

    const { POST } = await importRoute();
    const response = await POST(
      new NextRequest('http://localhost/api/hike-trips', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Pyrénées',
          activityIds: ['act-1', 'act-2'],
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      ...TRIP,
      createdAt: TRIP.createdAt.toISOString(),
      updatedAt: TRIP.updatedAt.toISOString(),
    });
    expect(createHikeTrip).toHaveBeenCalledWith({
      name: 'Pyrénées',
      activityIds: ['act-1', 'act-2'],
    });
  });

  it('returns 400 for invalid body', async () => {
    const { createHikeTrip } = await import('@/lib/queries');

    const { POST } = await importRoute();
    const response = await POST(
      new NextRequest('http://localhost/api/hike-trips', {
        method: 'POST',
        body: JSON.stringify({ name: '', activityIds: ['act-1'] }),
      }),
    );

    expect(response.status).toBe(400);
    expect(createHikeTrip).not.toHaveBeenCalled();
  });

  it('returns 409 when an activity is already linked elsewhere', async () => {
    const { createHikeTrip, HikeTripConflictError } = await import('@/lib/queries');
    vi.mocked(createHikeTrip).mockRejectedValue(
      new HikeTripConflictError(
        'Une activité appartient déjà à un autre déplacement',
        'trip-other',
        'Alpes',
      ),
    );

    const { POST } = await importRoute();
    const response = await POST(
      new NextRequest('http://localhost/api/hike-trips', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Pyrénées',
          activityIds: ['act-1', 'act-2'],
        }),
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Une activité appartient déjà à un autre déplacement',
      tripId: 'trip-other',
      tripName: 'Alpes',
    });
  });

  it('returns 400 for query validation errors', async () => {
    const { createHikeTrip, HikeTripValidationError } = await import('@/lib/queries');
    vi.mocked(createHikeTrip).mockRejectedValue(
      new HikeTripValidationError('Seules les randonnées peuvent être liées'),
    );

    const { POST } = await importRoute();
    const response = await POST(
      new NextRequest('http://localhost/api/hike-trips', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Pyrénées',
          activityIds: ['act-1', 'act-2'],
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Seules les randonnées peuvent être liées',
    });
  });
});
