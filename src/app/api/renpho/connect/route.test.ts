import { describe, expect, it } from 'vitest';
import { renphoConnectSchema } from './route';

describe('renphoConnectSchema', () => {
  it('accepts real-world credentials', () => {
    expect(
      renphoConnectSchema.safeParse({ email: 'athlete@example.com', password: 'hunter2' }).success,
    ).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(
      renphoConnectSchema.safeParse({ email: 'not-an-email', password: 'hunter2' }).success,
    ).toBe(false);
  });

  it('rejects an oversized email or password', () => {
    const tooLongEmail = `${'a'.repeat(310)}@example.com`;
    expect(
      renphoConnectSchema.safeParse({ email: tooLongEmail, password: 'hunter2' }).success,
    ).toBe(false);
    expect(
      renphoConnectSchema.safeParse({ email: 'athlete@example.com', password: 'a'.repeat(201) })
        .success,
    ).toBe(false);
  });
});
