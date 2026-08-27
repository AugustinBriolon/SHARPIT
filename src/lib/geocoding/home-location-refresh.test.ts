import { describe, expect, it } from 'vitest';
import {
  HOME_LOCATION_MOVE_METERS,
  HOME_LOCATION_REFRESH_MS,
  distanceMeters,
  hasMovedSignificantly,
  shouldRefreshHomeLocation,
} from '@/lib/geocoding/home-location-refresh';

describe('shouldRefreshHomeLocation', () => {
  const now = 1_700_000_000_000;

  it('refreshes when nothing has been recorded yet', () => {
    expect(shouldRefreshHomeLocation(null, now)).toBe(true);
  });

  it('holds off inside the refresh window', () => {
    expect(shouldRefreshHomeLocation(now - HOME_LOCATION_REFRESH_MS + 1, now)).toBe(false);
  });

  it('refreshes once the window has elapsed', () => {
    expect(shouldRefreshHomeLocation(now - HOME_LOCATION_REFRESH_MS, now)).toBe(true);
    expect(shouldRefreshHomeLocation(now - HOME_LOCATION_REFRESH_MS - 1, now)).toBe(true);
  });
});

describe('distanceMeters / hasMovedSignificantly', () => {
  it('reports ~0 for the same point', () => {
    expect(distanceMeters(48.92, 2.25, 48.92, 2.25)).toBeLessThan(1);
  });

  it('ignores GPS jitter under the move threshold', () => {
    expect(hasMovedSignificantly(48.92, 2.25, 48.92, 2.2513)).toBe(false);
  });

  it('flags a real relocation past the move threshold', () => {
    expect(hasMovedSignificantly(48.92, 2.25, 48.8566, 2.3522)).toBe(true);
    expect(HOME_LOCATION_MOVE_METERS).toBeGreaterThan(500);
  });
});
