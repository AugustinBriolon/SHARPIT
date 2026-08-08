import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries')>();
  return {
    ...actual,
    getHikeTripById: vi.fn(),
    updateHikeTrip: vi.fn(),
    deleteHikeTrip: vi.fn(),
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

const routeContext = { params: Promise.resolve({ id: 'trip-1' }) };

describe('GET /api/hike-trips/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when the trip does not exist', async () => {
    const { getHikeTripById } = await import('@/lib/queries');
    vi.mocked(getHikeTripById).mockResolvedValue(null);

    const { GET } = await importRoute();
    const response = await GET(
      new NextRequest('http://localhost/api/hike-trips/trip-1'),
      routeContext,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Dossier introuvable' });
  });

  it('returns the trip when it exists', async () => {
    const { getHikeTripById } = await import('@/lib/queries');
    vi.mocked(getHikeTripById).mockResolvedValue(TRIP);

    const { GET } = await importRoute();
    const response = await GET(
      new NextRequest('http://localhost/api/hike-trips/trip-1'),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ...TRIP,
      createdAt: TRIP.createdAt.toISOString(),
      updatedAt: TRIP.updatedAt.toISOString(),
    });
  });
});

describe('PATCH /api/hike-trips/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates the trip and returns 200', async () => {
    const { updateHikeTrip } = await import('@/lib/queries');
    vi.mocked(updateHikeTrip).mockResolvedValue({ ...TRIP, name: 'Renommé' });

    const { PATCH } = await importRoute();
    const response = await PATCH(
      new NextRequest('http://localhost/api/hike-trips/trip-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Renommé' }),
      }),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(updateHikeTrip).toHaveBeenCalledWith('trip-1', { name: 'Renommé' });
  });

  it('returns 400 for an empty patch', async () => {
    const { updateHikeTrip } = await import('@/lib/queries');

    const { PATCH } = await importRoute();
    const response = await PATCH(
      new NextRequest('http://localhost/api/hike-trips/trip-1', {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
      routeContext,
    );

    expect(response.status).toBe(400);
    expect(updateHikeTrip).not.toHaveBeenCalled();
  });

  it('returns 404 when the trip does not exist', async () => {
    const { updateHikeTrip, HikeTripValidationError } = await import('@/lib/queries');
    vi.mocked(updateHikeTrip).mockRejectedValue(new HikeTripValidationError('Dossier introuvable'));

    const { PATCH } = await importRoute();
    const response = await PATCH(
      new NextRequest('http://localhost/api/hike-trips/trip-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Renommé' }),
      }),
      routeContext,
    );

    expect(response.status).toBe(404);
  });

  it('returns 409 on membership conflict', async () => {
    const { updateHikeTrip, HikeTripConflictError } = await import('@/lib/queries');
    vi.mocked(updateHikeTrip).mockRejectedValue(
      new HikeTripConflictError(
        'Une activité appartient déjà à un autre déplacement',
        'trip-other',
        'Alpes',
      ),
    );

    const { PATCH } = await importRoute();
    const response = await PATCH(
      new NextRequest('http://localhost/api/hike-trips/trip-1', {
        method: 'PATCH',
        body: JSON.stringify({ addActivityIds: ['act-3'] }),
      }),
      routeContext,
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Une activité appartient déjà à un autre déplacement',
      tripId: 'trip-other',
      tripName: 'Alpes',
    });
  });
});

describe('DELETE /api/hike-trips/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the trip and returns 204', async () => {
    const { deleteHikeTrip } = await import('@/lib/queries');
    vi.mocked(deleteHikeTrip).mockResolvedValue(undefined);

    const { DELETE } = await importRoute();
    const response = await DELETE(
      new NextRequest('http://localhost/api/hike-trips/trip-1', { method: 'DELETE' }),
      routeContext,
    );

    expect(response.status).toBe(204);
    expect(deleteHikeTrip).toHaveBeenCalledWith('trip-1');
  });

  it('returns 404 when the trip does not exist', async () => {
    const { deleteHikeTrip, HikeTripValidationError } = await import('@/lib/queries');
    vi.mocked(deleteHikeTrip).mockRejectedValue(new HikeTripValidationError('Dossier introuvable'));

    const { DELETE } = await importRoute();
    const response = await DELETE(
      new NextRequest('http://localhost/api/hike-trips/trip-1', { method: 'DELETE' }),
      routeContext,
    );

    expect(response.status).toBe(404);
  });
});
