import { describe, expect, it } from 'vitest';
import { buildNutritionMacroTrend, type MacroTrendRow } from '@/lib/nutrition/macro-trend';

function row(date: string, overrides: Partial<MacroTrendRow> = {}): MacroTrendRow {
  return {
    date: new Date(`${date}T00:00:00Z`),
    calories: 2000,
    protein: 120,
    carbohydrates: 220,
    fat: 70,
    ...overrides,
  };
}

describe('buildNutritionMacroTrend', () => {
  it('returns nothing when no day was logged', () => {
    expect(buildNutritionMacroTrend([], 'week')).toEqual([]);
    expect(buildNutritionMacroTrend([row('2026-01-05', { calories: 0 })], 'week')).toEqual([]);
  });

  it('averages per logged day, not per calendar day', () => {
    // Monday 2026-01-05 and Wednesday 2026-01-07 are the same ISO week.
    const points = buildNutritionMacroTrend(
      [row('2026-01-05', { calories: 1800 }), row('2026-01-07', { calories: 2200 })],
      'week',
    );

    expect(points).toHaveLength(1);
    expect(points[0].daysLogged).toBe(2);
    expect(points[0].caloriesAvg).toBe(2000);
  });

  it('buckets by ISO week with an S-prefixed label', () => {
    const points = buildNutritionMacroTrend([row('2026-01-05')], 'week');
    expect(points[0].label).toBe('S2');
    expect(points[0].periodStart).toBe('2026-01-05');
  });

  it('buckets by calendar month', () => {
    const points = buildNutritionMacroTrend([row('2026-03-02'), row('2026-03-20')], 'month');
    expect(points).toHaveLength(1);
    expect(points[0].label).toBe('mars');
    expect(points[0].periodStart).toBe('2026-03-01');
  });

  it('disambiguates a month label once the range crosses a year boundary', () => {
    const points = buildNutritionMacroTrend([row('2025-03-10'), row('2026-03-10')], 'month');
    expect(points.map((p) => p.label)).toEqual(['mars 25', 'mars 26']);
  });

  it('buckets by calendar year', () => {
    const points = buildNutritionMacroTrend([row('2025-06-01'), row('2026-01-15')], 'year');
    expect(points.map((p) => p.label)).toEqual(['2025', '2026']);
  });

  it('derives the macro split from grams, not from goal calories', () => {
    // 100g protein (400 kcal) + 100g carbs (400 kcal) + 0g fat → 50/50 split.
    const points = buildNutritionMacroTrend(
      [row('2026-01-05', { protein: 100, carbohydrates: 100, fat: 0 })],
      'week',
    );

    expect(points[0].proteinPct).toBe(50);
    expect(points[0].carbohydratesPct).toBe(50);
    expect(points[0].fatPct).toBe(0);
  });

  it('reports no split when nothing was logged for a bucket that still has calories', () => {
    // Not reachable through calories>0 filtering directly, but a day logged with
    // macros at zero must not divide by zero.
    const points = buildNutritionMacroTrend(
      [row('2026-01-05', { protein: 0, carbohydrates: 0, fat: 0, calories: 500 })],
      'week',
    );

    expect(points[0].proteinPct).toBeNull();
    expect(points[0].carbohydratesPct).toBeNull();
    expect(points[0].fatPct).toBeNull();
  });

  it('orders buckets chronologically', () => {
    const points = buildNutritionMacroTrend(
      [row('2026-02-01'), row('2026-01-01'), row('2026-03-01')],
      'month',
    );
    expect(points.map((p) => p.periodStart)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
  });
});
