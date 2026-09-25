import { describe, expect, it } from 'vitest';
import { buildHikeTripSummary } from './hike-trip-summary';

const a = {
  date: new Date('2026-08-01T08:00:00'),
  duration: 3600,
  load: 40,
  observedLocationLabel: 'Chamonix',
  hikeMetrics: { distanceM: 10000, elevationM: 800, elevationLossM: 700 },
};
const b = {
  date: new Date('2026-08-02T09:00:00'),
  duration: 7200,
  load: 55,
  observedLocationLabel: 'Chamonix',
  hikeMetrics: { distanceM: 15000, elevationM: 1200, elevationLossM: 1100 },
};

describe('buildHikeTripSummary', () => {
  it('sums additive metrics and builds date window', () => {
    const s = buildHikeTripSummary([a, b]);
    expect(s.memberCount).toBe(2);
    expect(s.distanceM).toBe(25000);
    expect(s.elevationM).toBe(2000);
    expect(s.elevationLossM).toBe(1800);
    expect(s.durationSec).toBe(10800);
    expect(s.load).toBe(95);
    expect(s.startAt.getTime()).toBe(a.date.getTime());
    expect(s.endAt.getTime()).toBe(new Date('2026-08-02T11:00:00').getTime());
    expect(s.locationLabels).toEqual(['Chamonix']);
  });

  it('omits null-only aggregates', () => {
    const s = buildHikeTripSummary([
      { ...a, duration: null, load: null, hikeMetrics: null },
      { ...b, duration: null, load: null, hikeMetrics: null },
    ]);
    expect(s.durationSec).toBeNull();
    expect(s.distanceM).toBeNull();
    expect(s.load).toBeNull();
  });

  it('keeps distinct locations in chronological order', () => {
    const s = buildHikeTripSummary([a, { ...b, observedLocationLabel: 'Argentière' }]);
    expect(s.locationLabels).toEqual(['Chamonix', 'Argentière']);
  });
});
