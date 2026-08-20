import { describe, expect, it } from 'vitest';
import { buildHikeOvernightSummary } from './hike-overnight-summary';

const base = {
  date: new Date('2026-08-06T09:00:00'),
  duration: 3600,
  weather: 'Clear',
  load: 42,
  observedLocationLabel: 'Chamonix',
  hikeMetrics: { distanceM: 12000, elevationM: 800, elevationLossM: 750 },
};

describe('buildHikeOvernightSummary', () => {
  it('marks day variant under 8h without midnight crossing', () => {
    const s = buildHikeOvernightSummary(base);
    expect(s.variant).toBe('day');
    expect(s.endAt.getTime()).toBe(new Date('2026-08-06T10:00:00').getTime());
  });

  it('marks overnight when duration >= 8h', () => {
    const s = buildHikeOvernightSummary({ ...base, duration: 8 * 3600 });
    expect(s.variant).toBe('overnight');
  });

  it('marks overnight when window crosses local midnight', () => {
    const s = buildHikeOvernightSummary({
      ...base,
      date: new Date('2026-08-06T22:00:00'),
      duration: 3 * 3600,
    });
    expect(s.variant).toBe('overnight');
  });

  it('takes endPoint from last path coordinate', () => {
    const s = buildHikeOvernightSummary(base, {
      path: [
        [45.92, 6.86],
        [45.93, 6.87],
      ],
    });
    expect(s.endPoint).toEqual({ lat: 45.93, lng: 6.87 });
  });

  it('falls back elevationLoss to stream when metrics null', () => {
    const s = buildHikeOvernightSummary(
      { ...base, hikeMetrics: { distanceM: 1, elevationM: 1, elevationLossM: null } },
      { streamElevationLossM: 400 },
    );
    expect(s.elevationLossM).toBe(400);
  });
});
