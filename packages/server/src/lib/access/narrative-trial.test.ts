import { describe, expect, it } from 'vitest';
import { isActivityFreeEligible } from './narrative-trial';

describe('isActivityFreeEligible', () => {
  it('is eligible when the activity is on the same day the athlete joined', () => {
    expect(
      isActivityFreeEligible(new Date('2026-08-20T18:00:00Z'), new Date('2026-08-20T09:00:00Z')),
    ).toBe(true);
  });

  it('is eligible when the activity is after the athlete joined', () => {
    expect(isActivityFreeEligible(new Date('2026-08-25'), new Date('2026-08-20'))).toBe(true);
  });

  it('is not eligible when the activity predates the athlete joining (historical import)', () => {
    expect(isActivityFreeEligible(new Date('2026-08-15'), new Date('2026-08-20'))).toBe(false);
  });
});
