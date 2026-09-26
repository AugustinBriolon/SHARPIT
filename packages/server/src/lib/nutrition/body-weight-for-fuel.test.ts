import { describe, expect, it } from 'vitest';

import { macroGPerKg } from './body-weight-for-fuel';

describe('macroGPerKg', () => {
  it('computes grams per kilogram of body mass', () => {
    expect(macroGPerKg(148.6, 81.1)).toBe(1.83);
  });

  it('returns null without a valid weight', () => {
    expect(macroGPerKg(148.6, null)).toBeNull();
    expect(macroGPerKg(148.6, 0)).toBeNull();
  });
});
