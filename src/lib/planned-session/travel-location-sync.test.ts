import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import type { ClientPlannedSession } from '@/lib/query/types';
import {
  shouldApplyTravelLocationToSession,
  travelLocationPatch,
} from '@/lib/planned-session/travel-location-sync';

function session(overrides: Partial<ClientPlannedSession> = {}): ClientPlannedSession {
  return {
    id: 'ps-1',
    type: ActivityType.RUN,
    date: new Date('2026-08-10T12:00:00.000Z'),
    completed: false,
    activityId: null,
    exposureSetting: 'OUTDOOR',
    locationLabel: 'Paris',
    locationLat: 48.85,
    locationLng: 2.35,
    ...overrides,
  } as ClientPlannedSession;
}

const travel = {
  locationLabel: 'Nice',
  locationLat: 43.7,
  locationLng: 7.26,
  startDate: new Date('2026-08-01T00:00:00.000Z'),
  endDate: new Date('2026-08-20T00:00:00.000Z'),
};

describe('shouldApplyTravelLocationToSession', () => {
  it('applies when session day is inside travel and location differs', () => {
    expect(shouldApplyTravelLocationToSession(session(), travel)).toBe(true);
  });

  it('skips realized or indoor sessions', () => {
    expect(shouldApplyTravelLocationToSession(session({ completed: true }), travel)).toBe(false);
    expect(shouldApplyTravelLocationToSession(session({ exposureSetting: 'INDOOR' }), travel)).toBe(
      false,
    );
  });

  it('skips when location already matches travel', () => {
    expect(
      shouldApplyTravelLocationToSession(
        session({
          locationLabel: travel.locationLabel,
          locationLat: travel.locationLat,
          locationLng: travel.locationLng,
        }),
        travel,
      ),
    ).toBe(false);
  });
});

describe('travelLocationPatch', () => {
  it('returns outdoor coordinates from travel', () => {
    expect(travelLocationPatch(travel)).toEqual({
      exposureSetting: 'OUTDOOR',
      locationLabel: 'Nice',
      locationLat: 43.7,
      locationLng: 7.26,
    });
  });
});
