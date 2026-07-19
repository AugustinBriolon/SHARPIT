import { describe, expect, it } from 'vitest';
import { buildPlannedSessionViewModel } from '@/lib/presentation/planned-session';
import type { PlannedSessionContext } from '@/core/planned-session/types';
import type { PlannedSessionRecord } from '@/lib/planned-session/resolve-context';

function session(partial: Partial<PlannedSessionRecord> = {}): PlannedSessionRecord {
  return {
    id: 's1',
    type: 'BIKE',
    date: new Date('2026-07-20T12:00:00Z'),
    startTime: '09:00',
    durationMin: 60,
    intensity: 'ENDURANCE',
    title: 'Endurance',
    exposureSetting: 'UNKNOWN',
    locationLabel: null,
    locationLat: null,
    locationLng: null,
    locationType: null,
    environmentContext: null,
    environmentContextAt: null,
    ...partial,
  };
}

function context(partial: Partial<PlannedSessionContext> = {}): PlannedSessionContext {
  return {
    intention: {
      sessionId: 's1',
      type: 'BIKE',
      scheduledStart: new Date().toISOString(),
      scheduledEnd: new Date().toISOString(),
      durationMin: 60,
      intensity: 'ENDURANCE',
      exposure: 'UNKNOWN',
      location: {
        latitude: 48.92,
        longitude: 2.25,
        label: 'Colombes, France',
      },
      locationType: 'ROAD',
      title: 'Endurance',
    },
    environment: null,
    advisories: [
      {
        kind: 'CONFIRM_LOCATION',
        priority: 1,
        headlineCode: 'planned.advisory.confirmLocation.headline',
        rationaleCode: 'planned.advisory.confirmLocation.rationale',
        confidence: 0.5,
      },
    ],
    preparation: [
      {
        code: 'planned.prep.confirmExposure',
      },
    ],
    ...partial,
  };
}

describe('buildPlannedSessionViewModel location confirmation', () => {
  it('exposes proposed location coords from intention when session has none', () => {
    const vm = buildPlannedSessionViewModel({
      session: session(),
      context: context(),
    });

    expect(vm.context.needsLocationConfirmation).toBe(true);
    expect(vm.context.locationLabel).toBe('Colombes, France');
    expect(vm.context.locationLatitude).toBe(48.92);
    expect(vm.context.locationLongitude).toBe(2.25);
  });

  it('prefers persisted session coordinates over intention', () => {
    const vm = buildPlannedSessionViewModel({
      session: session({
        locationLabel: 'Paris',
        locationLat: 48.85,
        locationLng: 2.35,
        exposureSetting: 'OUTDOOR',
      }),
      context: context({
        intention: {
          ...context().intention,
          exposure: 'OUTDOOR',
        },
        advisories: [],
        preparation: [],
      }),
    });

    expect(vm.context.locationLabel).toBe('Paris');
    expect(vm.context.locationLatitude).toBe(48.85);
    expect(vm.context.locationLongitude).toBe(2.35);
  });
});
