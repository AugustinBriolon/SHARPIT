import { describe, expect, it, vi, afterEach } from 'vitest';
import { formatBudgetRetryEta } from './ai-budget-shared';

describe('formatBudgetRetryEta', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a relative duration in minutes under an hour', () => {
    expect(formatBudgetRetryEta(5 * 60)).toBe('dans 5 min');
    expect(formatBudgetRetryEta(30)).toBe('dans 1 min'); // rounds up, never "dans 0 min"
  });

  it('switches to an absolute local clock time at an hour or more', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-29T14:00:00'));

    // 2h30 from "now" — a relative "dans 2h" would go stale the moment the
    // tab sits open a while; the absolute time does not.
    expect(formatBudgetRetryEta(2.5 * 60 * 60)).toBe('à 16:30');
  });

  it('never dips back into minutes right at the one-hour boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-29T14:00:00'));

    expect(formatBudgetRetryEta(3_600)).toBe('à 15:00');
  });
});
