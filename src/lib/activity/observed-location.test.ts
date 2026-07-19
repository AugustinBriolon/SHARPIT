import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/geocoding/nominatim', () => ({
  reverseGeocode: vi.fn(),
}));

vi.mock('@/lib/environment/athlete-location', () => ({
  resolveAthleteGeoLocation: vi.fn(),
}));

describe('backfillActivityObservedLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('overrides a stale travel stamp when GPS stream (map) is present', async () => {
    const { resolveAthleteGeoLocation } = await import('@/lib/environment/athlete-location');
    const { reverseGeocode } = await import('@/lib/geocoding/nominatim');
    vi.mocked(reverseGeocode).mockResolvedValue({
      label: 'Colombes, France',
      latitude: 48.2,
      longitude: 2.2,
    } as never);

    const { backfillActivityObservedLocation } = await import('@/lib/activity/observed-location');

    const prisma = {
      activity: {
        findUnique: vi.fn().mockResolvedValue({
          observedLocationLat: 46.5,
          observedLocationLng: -1.78,
          observedLocationLabel: 'Olonne-sur-Mer, France',
          date: new Date('2026-07-19T10:00:00Z'),
          stream: {
            data: {
              latlng: [
                [48.1, 2.1],
                [48.2, 2.2],
                [48.3, 2.3],
              ],
            },
          },
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    const result = await backfillActivityObservedLocation(prisma as never, 'act-1');

    expect(resolveAthleteGeoLocation).not.toHaveBeenCalled();
    expect(result).toEqual({
      label: 'Colombes, France',
      latitude: 48.2,
      longitude: 2.2,
    });
    expect(prisma.activity.update).toHaveBeenCalledWith({
      where: { id: 'act-1' },
      data: {
        observedLocationLabel: 'Colombes, France',
        observedLocationLat: 48.2,
        observedLocationLng: 2.2,
      },
    });
  });

  it('keeps existing map coords when no GPS stream and does not call travel fallback', async () => {
    const { resolveAthleteGeoLocation } = await import('@/lib/environment/athlete-location');
    const { reverseGeocode } = await import('@/lib/geocoding/nominatim');
    const { backfillActivityObservedLocation } = await import('@/lib/activity/observed-location');

    const prisma = {
      activity: {
        findUnique: vi.fn().mockResolvedValue({
          observedLocationLat: 48.92,
          observedLocationLng: 2.25,
          observedLocationLabel: 'Colombes, France',
          date: new Date('2026-07-19T10:00:00Z'),
          stream: null,
        }),
        update: vi.fn(),
      },
    };

    const result = await backfillActivityObservedLocation(prisma as never, 'act-2');

    expect(result).toEqual({
      label: 'Colombes, France',
      latitude: 48.92,
      longitude: 2.25,
    });
    expect(resolveAthleteGeoLocation).not.toHaveBeenCalled();
    expect(reverseGeocode).not.toHaveBeenCalled();
    expect(prisma.activity.update).not.toHaveBeenCalled();
  });

  it('geocodes label when map coords exist without label, still without travel', async () => {
    const { resolveAthleteGeoLocation } = await import('@/lib/environment/athlete-location');
    const { reverseGeocode } = await import('@/lib/geocoding/nominatim');
    vi.mocked(reverseGeocode).mockResolvedValue({
      label: 'Colombes, Île-de-France, France',
      latitude: 48.92,
      longitude: 2.25,
    } as never);

    const { backfillActivityObservedLocation } = await import('@/lib/activity/observed-location');

    const prisma = {
      activity: {
        findUnique: vi.fn().mockResolvedValue({
          observedLocationLat: 48.92,
          observedLocationLng: 2.25,
          observedLocationLabel: null,
          date: new Date('2026-07-19T10:00:00Z'),
          stream: null,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    const result = await backfillActivityObservedLocation(prisma as never, 'act-3');

    expect(result?.latitude).toBe(48.92);
    expect(result?.longitude).toBe(2.25);
    expect(result?.label).toContain('Colombes');
    expect(resolveAthleteGeoLocation).not.toHaveBeenCalled();
    expect(prisma.activity.update).toHaveBeenCalledWith({
      where: { id: 'act-3' },
      data: { observedLocationLabel: expect.stringContaining('Colombes') },
    });
  });
});
