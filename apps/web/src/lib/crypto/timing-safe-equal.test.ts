import { describe, expect, it } from 'vitest';
import { timingSafeEqualString } from './timing-safe-equal';

describe('timingSafeEqualString', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeEqualString('secret-token', 'secret-token')).toBe(true);
  });

  it('returns false for different strings of the same length', () => {
    expect(timingSafeEqualString('secret-token', 'secret-tokEn')).toBe(false);
  });

  it('returns false for different-length strings without throwing', () => {
    expect(() => timingSafeEqualString('short', 'a-much-longer-string')).not.toThrow();
    expect(timingSafeEqualString('short', 'a-much-longer-string')).toBe(false);
  });

  it('treats empty strings as equal to each other only', () => {
    expect(timingSafeEqualString('', '')).toBe(true);
    expect(timingSafeEqualString('', 'x')).toBe(false);
  });
});
