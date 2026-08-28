import { ActivityType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { estimateActivityLoad, type ActivityForAnalytics } from './activity-load';

const REF_DATE = new Date('2026-01-31T12:00:00');

function makeActivity(
  date: Date,
  type: ActivityType,
  load: number | null = null,
  durationMin: number | null = null,
): ActivityForAnalytics {
  return {
    date,
    type,
    duration: durationMin !== null ? durationMin * 60 : null,
    load,
    bikeMetrics: null,
  };
}

describe('estimateActivityLoad', () => {
  it('prefers the explicit load when present', () => {
    expect(estimateActivityLoad(makeActivity(REF_DATE, 'RUN', 150))).toBe(150);
  });

  it('falls back to the bike TSS from bikeMetrics', () => {
    const activity: ActivityForAnalytics = {
      date: REF_DATE,
      type: 'BIKE',
      duration: 3600,
      load: null,
      bikeMetrics: { tss: 200 },
    };
    expect(estimateActivityLoad(activity)).toBe(200);
  });

  it('estimates from duration using the per-sport factor', () => {
    // RUN 1.0, BIKE 0.85, SWIM 1.1, STRENGTH 0.7 — 60 min each.
    expect(estimateActivityLoad(makeActivity(REF_DATE, 'RUN', null, 60))).toBe(60);
    expect(estimateActivityLoad(makeActivity(REF_DATE, 'BIKE', null, 60))).toBe(51);
    expect(estimateActivityLoad(makeActivity(REF_DATE, 'SWIM', null, 60))).toBe(66);
    expect(estimateActivityLoad(makeActivity(REF_DATE, 'STRENGTH', null, 60))).toBe(42);
  });

  it('returns 0 with neither duration nor load', () => {
    expect(estimateActivityLoad(makeActivity(REF_DATE, 'RUN'))).toBe(0);
  });
});
