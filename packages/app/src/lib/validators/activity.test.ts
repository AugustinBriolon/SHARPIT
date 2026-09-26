import { describe, expect, it } from 'vitest';
import { createActivitySchema } from './activity';

function baseActivity() {
  return { type: 'RUN' as const, date: '2026-01-01' };
}

describe('createActivitySchema size caps', () => {
  it('accepts a realistic free-text note', () => {
    const parsed = createActivitySchema.safeParse({ ...baseActivity(), notes: 'a'.repeat(500) });
    expect(parsed.success).toBe(true);
  });

  it('rejects an oversized free-text field', () => {
    const parsed = createActivitySchema.safeParse({ ...baseActivity(), notes: 'a'.repeat(2001) });
    expect(parsed.success).toBe(false);
  });

  it('rejects an oversized strength exercise name', () => {
    const parsed = createActivitySchema.safeParse({
      ...baseActivity(),
      strengthSets: [{ exercise: 'a'.repeat(201), sets: 3, reps: 10 }],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects more than 50 strength sets', () => {
    const strengthSets = Array.from({ length: 51 }, (_, i) => ({
      exercise: `set-${i}`,
      sets: 3,
      reps: 10,
    }));
    const parsed = createActivitySchema.safeParse({ ...baseActivity(), strengthSets });
    expect(parsed.success).toBe(false);
  });

  it('accepts exactly 50 strength sets', () => {
    const strengthSets = Array.from({ length: 50 }, (_, i) => ({
      exercise: `set-${i}`,
      sets: 3,
      reps: 10,
    }));
    const parsed = createActivitySchema.safeParse({ ...baseActivity(), strengthSets });
    expect(parsed.success).toBe(true);
  });
});
