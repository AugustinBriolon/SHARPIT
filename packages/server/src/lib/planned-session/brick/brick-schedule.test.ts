import { describe, expect, it } from 'vitest';
import { chainBrickLegStartTimes } from '@sharpit/server/lib/planned-session/brick/brick-schedule';

describe('chainBrickLegStartTimes', () => {
  it('places each leg after the previous one ends', () => {
    expect(chainBrickLegStartTimes('09:00', [{ durationMin: 90 }, { durationMin: 30 }])).toEqual([
      '09:00',
      '10:30',
    ]);
  });

  it('chains more than two legs', () => {
    expect(
      chainBrickLegStartTimes('07:15', [
        { durationMin: 45 },
        { durationMin: 20 },
        { durationMin: 40 },
      ]),
    ).toEqual(['07:15', '08:00', '08:20']);
  });

  // Without a fallback span the next leg would inherit the same start — the very
  // overlap this helper exists to remove.
  it('gives an undeclared duration an hour rather than stacking the next leg', () => {
    expect(chainBrickLegStartTimes('06:00', [{ durationMin: null }, { durationMin: 30 }])).toEqual([
      '06:00',
      '07:00',
    ]);
    expect(chainBrickLegStartTimes('06:00', [{}, {}])).toEqual(['06:00', '07:00']);
  });

  it('treats a non-positive duration as undeclared', () => {
    expect(chainBrickLegStartTimes('06:00', [{ durationMin: 0 }, { durationMin: 10 }])).toEqual([
      '06:00',
      '07:00',
    ]);
  });

  it('leaves every leg untimed when the brick has no usable start', () => {
    const legs = [{ durationMin: 60 }, { durationMin: 30 }];

    expect(chainBrickLegStartTimes(null, legs)).toEqual([null, null]);
    expect(chainBrickLegStartTimes(undefined, legs)).toEqual([null, null]);
    expect(chainBrickLegStartTimes('   ', legs)).toEqual([null, null]);
    expect(chainBrickLegStartTimes('25:00', legs)).toEqual([null, null]);
    expect(chainBrickLegStartTimes('nonsense', legs)).toEqual([null, null]);
  });

  it('accepts a single-digit hour', () => {
    expect(chainBrickLegStartTimes('7:05', [{ durationMin: 25 }, { durationMin: 10 }])).toEqual([
      '07:05',
      '07:30',
    ]);
  });

  it('clamps a leg that would spill past midnight', () => {
    expect(chainBrickLegStartTimes('23:30', [{ durationMin: 90 }, { durationMin: 30 }])).toEqual([
      '23:30',
      '23:59',
    ]);
  });

  it('returns nothing for no legs', () => {
    expect(chainBrickLegStartTimes('09:00', [])).toEqual([]);
  });
});
