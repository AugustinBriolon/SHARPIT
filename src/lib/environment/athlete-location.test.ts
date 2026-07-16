import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/geocoding/default-activity-location', () => ({
  resolveDefaultActivityLocation: vi.fn(),
}));

function mockPrisma(recentActivity: unknown) {
  return {
    activity: {
      findFirst: vi.fn().mockResolvedValue(recentActivity),
    },
  } as never;
}

describe('resolveAthleteGeoLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers the own-day GPS stream when present, without consulting travel context', async () => {
    const { resolveDefaultActivityLocation } =
      await import('@/lib/geocoding/default-activity-location');
    const { resolveAthleteGeoLocation } = await import('@/lib/environment/athlete-location');

    const prisma = mockPrisma({
      stream: {
        data: {
          latlng: [
            [48.1, 2.1],
            [48.2, 2.2],
            [48.3, 2.3],
          ],
        },
      },
    });

    const result = await resolveAthleteGeoLocation(prisma, 'default', '2026-07-16');

    expect(result).toEqual({ latitude: 48.2, longitude: 2.2 });
    expect(resolveDefaultActivityLocation).not.toHaveBeenCalled();
  });

  it('falls back to resolveDefaultActivityLocation (travel-aware) when no GPS stream is available', async () => {
    const { resolveDefaultActivityLocation } =
      await import('@/lib/geocoding/default-activity-location');
    vi.mocked(resolveDefaultActivityLocation).mockResolvedValue({
      latitude: 59.33,
      longitude: 18.06,
      label: 'Stockholm, Suède',
      source: 'travel',
    });
    const { resolveAthleteGeoLocation } = await import('@/lib/environment/athlete-location');

    const prisma = mockPrisma(null);

    const result = await resolveAthleteGeoLocation(prisma, 'default', '2026-07-16');

    expect(result).toEqual({
      latitude: 59.33,
      longitude: 18.06,
      label: 'Stockholm, Suède',
      source: 'travel',
    });
    expect(resolveDefaultActivityLocation).toHaveBeenCalledTimes(1);
    const [[, onDate]] = vi.mocked(resolveDefaultActivityLocation).mock.calls;
    expect(onDate).toBeInstanceOf(Date);
  });

  it('resolves to home location (via resolveDefaultActivityLocation) when there is no active travel context', async () => {
    const { resolveDefaultActivityLocation } =
      await import('@/lib/geocoding/default-activity-location');
    vi.mocked(resolveDefaultActivityLocation).mockResolvedValue({
      latitude: 48.922778,
      longitude: 2.252222,
      label: 'Colombes, France',
      source: 'home',
    });
    const { resolveAthleteGeoLocation } = await import('@/lib/environment/athlete-location');

    const prisma = mockPrisma({ stream: null });

    const result = await resolveAthleteGeoLocation(prisma, 'default', '2026-07-16');

    expect(result.label).toBe('Colombes, France');
  });
});
