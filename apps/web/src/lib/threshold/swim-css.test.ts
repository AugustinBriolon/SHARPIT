import { describe, expect, it } from 'vitest';
import {
  CSS_MATERIALITY_SEC_PER_100M,
  estimateSwimCss,
  fmtCssSecPer100m,
  shouldSuggestSwimCss,
  type SwimCssSample,
} from '@/lib/threshold/swim-css';

const NOW = new Date('2026-08-20T12:00:00.000Z');

function sample(overrides: Partial<SwimCssSample> = {}): SwimCssSample {
  return {
    paceSecPer100m: 100,
    distanceM: 2000,
    date: '2026-08-10T09:00:00.000Z',
    ...overrides,
  };
}

describe('estimateSwimCss', () => {
  it('takes the second-fastest, so one anomalous session cannot set the threshold', () => {
    const estimate = estimateSwimCss(
      [
        sample({ paceSecPer100m: 91 }), // mis-recorded, twenty seconds clear of the rest
        sample({ paceSecPer100m: 109 }),
        sample({ paceSecPer100m: 110 }),
        sample({ paceSecPer100m: 118 }),
      ],
      { windowDays: 120, now: NOW },
    );
    expect(estimate).toBe(109);
  });

  it('is not dragged slow by a technique-heavy session', () => {
    const estimate = estimateSwimCss(
      [
        sample({ paceSecPer100m: 100 }),
        sample({ paceSecPer100m: 104 }),
        sample({ paceSecPer100m: 245 }),
      ],
      { windowDays: 120, now: NOW },
    );
    expect(estimate).toBe(104);
  });

  it('falls back to the only session it has when there is nothing to trim', () => {
    expect(estimateSwimCss([sample({ paceSecPer100m: 105 })], { windowDays: 120, now: NOW })).toBe(
      105,
    );
    expect(
      estimateSwimCss([sample({ paceSecPer100m: 105 }), sample({ paceSecPer100m: 120 })], {
        windowDays: 120,
        now: NOW,
      }),
    ).toBe(105);
  });

  it('drops short sessions, where the average reflects drills rather than speed', () => {
    const estimate = estimateSwimCss(
      [sample({ paceSecPer100m: 80, distanceM: 400 }), sample({ paceSecPer100m: 100 })],
      { windowDays: 120, now: NOW },
    );
    expect(estimate).toBe(100);
  });

  it('ignores sessions outside the recency window', () => {
    const estimate = estimateSwimCss(
      [
        sample({ paceSecPer100m: 80, date: '2025-01-01T09:00:00.000Z' }),
        sample({ paceSecPer100m: 100 }),
      ],
      { windowDays: 120, now: NOW },
    );
    expect(estimate).toBe(100);
  });

  it('returns null rather than a number it cannot support', () => {
    expect(estimateSwimCss([], { windowDays: 120, now: NOW })).toBeNull();
    expect(estimateSwimCss([sample({ distanceM: 300 })], { windowDays: 120, now: NOW })).toBeNull();
  });
});

describe('shouldSuggestSwimCss', () => {
  it('sets a reference the athlete does not have yet', () => {
    expect(shouldSuggestSwimCss(null, 100)).toBe(true);
  });

  it('stays quiet on a move too small to feel', () => {
    expect(shouldSuggestSwimCss(100, 100 + CSS_MATERIALITY_SEC_PER_100M - 0.5)).toBe(false);
  });

  it('suggests a material move in either direction', () => {
    expect(shouldSuggestSwimCss(100, 97)).toBe(true);
    expect(shouldSuggestSwimCss(100, 103)).toBe(true);
  });

  it('suggests nothing without an estimate', () => {
    expect(shouldSuggestSwimCss(100, null)).toBe(false);
  });
});

describe('fmtCssSecPer100m', () => {
  it('pads seconds', () => {
    expect(fmtCssSecPer100m(98)).toBe('1:38/100m');
    expect(fmtCssSecPer100m(120)).toBe('2:00/100m');
  });
});
