import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { isWeeklyReviewSlot } = await import('./athlete-provider-sync');

describe('isWeeklyReviewSlot', () => {
  it('is Sunday evening only, once the week is done', () => {
    expect(isWeeklyReviewSlot(new Date('2026-10-04T21:00:00Z'))).toBe(true);
    expect(isWeeklyReviewSlot(new Date('2026-10-04T06:30:00Z'))).toBe(false);
    expect(isWeeklyReviewSlot(new Date('2026-10-04T12:00:00Z'))).toBe(false);
    expect(isWeeklyReviewSlot(new Date('2026-10-03T21:00:00Z'))).toBe(false);
  });
});
