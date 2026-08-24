import { describe, expect, it } from 'vitest';
import { macroColumnFillPx, macroRowScalePeak } from './nutrition-macro-breakdown-section';

describe('macroColumnFillPx', () => {
  it('keeps 4 g shorter than 7 g on the same row', () => {
    expect(macroColumnFillPx(4, 7)).toBe(23);
    expect(macroColumnFillPx(7, 7)).toBe(40);
  });

  it('returns 0 when the day is empty', () => {
    expect(macroColumnFillPx(null, 7)).toBe(0);
    expect(macroColumnFillPx(0, 7)).toBe(0);
  });
});

describe('macroRowScalePeak', () => {
  it('uses the higher of logged grams and goal so a 4 g day never matches a 7 g day', () => {
    const days = [
      {
        key: 'a',
        weekday: 'L',
        entry: {
          carbohydrates: 4,
          fat: 0,
          protein: 0,
          goalsProgress: { carbohydrates: { goal: 7 } },
        },
      },
      {
        key: 'b',
        weekday: 'M',
        entry: {
          carbohydrates: 7,
          fat: 0,
          protein: 0,
          goalsProgress: { carbohydrates: { goal: 7 } },
        },
      },
    ];
    expect(macroRowScalePeak(days as never, 'carbohydrates')).toBe(7);
  });
});
