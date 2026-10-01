import { describe, expect, it } from 'vitest';
import { gramsFromPercent, percentFromGrams, percentTotal } from './nutrition-targets';

describe('nutrition target split', () => {
  it('turns a share of the calories into grams, 4 kcal/g for protein and carbs, 9 for fat', () => {
    expect(gramsFromPercent(2600, 25, 'protein')).toBe(163);
    expect(gramsFromPercent(2600, 50, 'carbs')).toBe(325);
    expect(gramsFromPercent(2600, 25, 'fat')).toBe(72);
  });

  it('turns grams back into a share to prefill a split, when the calories are known', () => {
    expect(percentFromGrams(2600, 163, 'protein')).toBe(25);
    expect(percentFromGrams(2600, 72, 'fat')).toBe(25);
    expect(percentFromGrams(null, 72, 'fat')).toBeNull();
    expect(percentFromGrams(2600, null, 'fat')).toBeNull();
  });

  it('adds up the shares, an unset one counting zero', () => {
    expect(percentTotal([25, 50, null])).toBe(75);
  });
});
