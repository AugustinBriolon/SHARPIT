import { describe, it, expect } from 'vitest';
import { resolveRecommendationsFreshness } from './freshness-service';

const EARLIER = new Date('2026-07-15T08:00:00.000Z');
const LATER = new Date('2026-07-15T12:00:00.000Z');

describe('resolveRecommendationsFreshness', () => {
  it('is computing while a recommendation run is in flight', () => {
    expect(resolveRecommendationsFreshness(true, EARLIER, null, null, null, 'morning')).toBe(
      'computing',
    );
  });

  it('is awaiting_data when no briefing exists yet', () => {
    expect(resolveRecommendationsFreshness(false, null, null, null, null, 'morning')).toBe(
      'awaiting_data',
    );
  });

  it('is stale when reasoning ran after the briefing', () => {
    expect(resolveRecommendationsFreshness(false, EARLIER, LATER, null, null, 'morning')).toBe(
      'stale',
    );
  });

  it('is stale when a new session landed after the briefing', () => {
    expect(resolveRecommendationsFreshness(false, EARLIER, null, LATER, null, 'morning')).toBe(
      'stale',
    );
  });

  it('is stale when the briefing phase differs from the current phase (morning → afternoon)', () => {
    expect(
      resolveRecommendationsFreshness(false, EARLIER, null, null, 'morning', 'afternoon'),
    ).toBe('stale');
  });

  it('is fresh when nothing changed and the phase matches', () => {
    expect(resolveRecommendationsFreshness(false, EARLIER, null, null, 'morning', 'morning')).toBe(
      'fresh',
    );
  });

  it('is fresh when phaseAtGeneration is unknown (legacy briefing, no phase recorded)', () => {
    expect(resolveRecommendationsFreshness(false, EARLIER, null, null, null, 'afternoon')).toBe(
      'fresh',
    );
  });
});
