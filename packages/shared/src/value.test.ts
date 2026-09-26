import { describe, expect, it } from 'vitest';
import { formatStatBit, isSet } from './value';

describe('isSet', () => {
  it('rejects only null and undefined', () => {
    expect(isSet(null)).toBe(false);
    expect(isSet(undefined)).toBe(false);
    expect(isSet(0)).toBe(true);
    expect(isSet('')).toBe(true);
    expect(isSet(false)).toBe(true);
  });
});

describe('formatStatBit', () => {
  it('formats a present value, zero included', () => {
    expect(formatStatBit(0, (value) => `${value} km`)).toBe('0 km');
  });

  it('returns null for a missing value without calling the formatter', () => {
    let calls = 0;
    const format = (value: number) => {
      calls += 1;
      return String(value);
    };
    expect(formatStatBit(null, format)).toBeNull();
    expect(formatStatBit(undefined, format)).toBeNull();
    expect(calls).toBe(0);
  });
});
