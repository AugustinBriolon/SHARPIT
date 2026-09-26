import { describe, expect, it } from 'vitest';
import { createClientId } from './client-id';

describe('createClientId', () => {
  it('returns a non-empty string', () => {
    const id = createClientId();
    expect(id.length).toBeGreaterThan(8);
  });

  it('returns distinct values across calls', () => {
    const a = createClientId();
    const b = createClientId();
    expect(a).not.toBe(b);
  });
});
