import { describe, expect, it } from 'vitest';
import type { NutritionDaySummary } from '@/core/presentation/nutrition-view-model';
import {
  macroColumnFillPx,
  macroDayReadout,
  macroRowScalePeak,
} from './nutrition-macro-breakdown-section';

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

describe('macroDayReadout', () => {
  function day(entry: Partial<NutritionDaySummary> | null) {
    return { key: '2026-09-10', weekday: 'J', entry: entry as NutritionDaySummary | null };
  }

  it('reads each macro as plain text, never an object', () => {
    const label = macroDayReadout(
      day({ carbohydrates: 285.6, fat: 87, protein: 146.2, goalsProgress: null }),
    );

    expect(label).toBe('jeudi 10 sept. · Glucides 286 g · Lipides 87 g · Protéines 146 g');
    expect(label).not.toContain('[object Object]');
  });

  it('adds the goal in spoken form when there is one', () => {
    const label = macroDayReadout(
      day({
        carbohydrates: 245,
        fat: 74,
        protein: 150,
        goalsProgress: {
          carbohydrates: { goal: 328 },
          fat: { goal: 98 },
          protein: { goal: 188 },
        } as NutritionDaySummary['goalsProgress'],
      }),
    );

    expect(label).toBe(
      'jeudi 10 sept. · Glucides 245 g sur 328 g · Lipides 74 g sur 98 g · Protéines 150 g sur 188 g',
    );
  });

  it('says there is no diary for an empty day', () => {
    expect(macroDayReadout(day(null))).toBe('jeudi 10 sept. · Pas de journal');
  });
});
