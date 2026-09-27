import { describe, expect, it } from 'vitest';
import {
  BIOLOGICAL_AGE_METHOD,
  ageInYears,
  estimateBiologicalAge,
  fitnessAge,
  type BiologicalAgeInputs,
} from '@sharpit/server/lib/body/biological-age';

const now = new Date('2026-09-27T12:00:00.000Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

function inputs(overrides: Partial<BiologicalAgeInputs> = {}): BiologicalAgeInputs {
  return {
    birthDate: new Date('1990-05-10T00:00:00.000Z'),
    sex: 'male',
    vo2maxRunning: 49,
    vo2maxCycling: null,
    vo2maxMeasuredAt: daysAgo(3),
    ...overrides,
  };
}

describe('fitnessAge', () => {
  it('lands on the decade midpoint when the reading equals its mean', () => {
    expect(fitnessAge(49, 'male')).toBe(35);
    expect(fitnessAge(38, 'female')).toBe(45);
  });

  it('interpolates between midpoints', () => {
    expect(fitnessAge(44.5, 'male')).toBe(50);
  });

  it('extends the end segments and clamps to 20–80', () => {
    expect(fitnessAge(56, 'male')).toBe(21);
    expect(fitnessAge(70, 'male')).toBe(20);
    expect(fitnessAge(15, 'female')).toBe(80);
  });
});

describe('ageInYears', () => {
  it('counts a birthday only once it has passed', () => {
    expect(ageInYears(new Date('1990-09-27T00:00:00.000Z'), now)).toBe(36);
    expect(ageInYears(new Date('1990-09-28T00:00:00.000Z'), now)).toBe(35);
  });
});

describe('estimateBiologicalAge', () => {
  it('estimates from running VO₂max with high confidence for a recent reading', () => {
    expect(estimateBiologicalAge(inputs(), now)).toEqual({
      years: 35,
      chronologicalYears: 36,
      method: BIOLOGICAL_AGE_METHOD,
      confidence: 0.9,
      inputs: ['vo2maxRun', 'sex', 'birthDate'],
      computedAt: now.toISOString(),
    });
  });

  it('falls back to cycling VO₂max', () => {
    const estimate = estimateBiologicalAge(inputs({ vo2maxRunning: null, vo2maxCycling: 47 }), now);
    expect(estimate?.years).toBe(45);
    expect(estimate?.inputs[0]).toBe('vo2maxBike');
  });

  it('lowers confidence for a reading between 30 and 90 days old', () => {
    expect(estimateBiologicalAge(inputs({ vo2maxMeasuredAt: daysAgo(60) }), now)?.confidence).toBe(
      0.6,
    );
  });

  it('gives no estimate without the data the method needs', () => {
    for (const missing of [
      { birthDate: null },
      { sex: null },
      { sex: 'other' },
      { vo2maxRunning: null },
      { vo2maxMeasuredAt: null },
      { vo2maxMeasuredAt: daysAgo(120) },
    ]) {
      expect(estimateBiologicalAge(inputs(missing), now), JSON.stringify(missing)).toBeNull();
    }
  });
});
