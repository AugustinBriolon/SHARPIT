import { describe, expect, it } from 'vitest';
import { dedupeNutritionRowsByDay, pickNutritionRow } from './nutrition-source';

const day = (iso: string, provider: string) => ({ date: new Date(`${iso}T00:00:00Z`), provider });

describe('pickNutritionRow', () => {
  it('prefers the log kept in SHARPIT over another provider', () => {
    expect(
      pickNutritionRow([day('2026-10-01', 'myfitnesspal'), day('2026-10-01', 'sharpit')]),
    ).toEqual(day('2026-10-01', 'sharpit'));
  });

  it('falls back to another provider, and to nothing', () => {
    expect(pickNutritionRow([day('2026-10-01', 'myfitnesspal')])?.provider).toBe('myfitnesspal');
    expect(pickNutritionRow([])).toBeNull();
  });
});

describe('an imported MyFitnessPal export', () => {
  it('fills a day only when neither SHARPIT nor a live sync has it', () => {
    const imported = day('2026-10-01', 'myfitnesspal_import');
    expect(pickNutritionRow([imported, day('2026-10-01', 'myfitnesspal')])?.provider).toBe(
      'myfitnesspal',
    );
    expect(pickNutritionRow([imported])).toEqual(imported);
  });
});

describe('dedupeNutritionRowsByDay', () => {
  it('keeps one row per day, in the order given', () => {
    const rows = [
      day('2026-10-02', 'myfitnesspal'),
      day('2026-10-01', 'myfitnesspal'),
      day('2026-10-01', 'sharpit'),
    ];
    expect(dedupeNutritionRowsByDay(rows)).toEqual([
      day('2026-10-02', 'myfitnesspal'),
      day('2026-10-01', 'sharpit'),
    ]);
  });
});
