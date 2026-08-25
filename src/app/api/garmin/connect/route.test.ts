import { describe, expect, it } from 'vitest';
import { garminConnectSchema } from './route';

describe('garminConnectSchema', () => {
  it('accepts real-world credentials', () => {
    expect(
      garminConnectSchema.safeParse({ username: 'athlete@example.com', password: 'hunter2' })
        .success,
    ).toBe(true);
  });

  it('rejects an oversized username or password payload', () => {
    const tooLong = 'a'.repeat(201);
    expect(garminConnectSchema.safeParse({ username: tooLong, password: 'hunter2' }).success).toBe(
      false,
    );
    expect(garminConnectSchema.safeParse({ username: 'athlete', password: tooLong }).success).toBe(
      false,
    );
  });

  it('rejects empty credentials', () => {
    expect(garminConnectSchema.safeParse({ username: '', password: 'hunter2' }).success).toBe(
      false,
    );
  });
});
