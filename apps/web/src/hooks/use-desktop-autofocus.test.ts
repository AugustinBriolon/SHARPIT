import { describe, expect, it } from 'vitest';
import { FINE_POINTER_QUERY, isFinePointer } from './use-desktop-autofocus';

describe('isFinePointer', () => {
  it('is true when the fine-pointer query matches', () => {
    expect(isFinePointer((query) => ({ matches: query === FINE_POINTER_QUERY }))).toBe(true);
  });

  it('is false on coarse pointers (phones, most tablets)', () => {
    expect(isFinePointer(() => ({ matches: false }))).toBe(false);
  });
});
