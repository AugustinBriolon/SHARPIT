import { describe, expect, it } from 'vitest';
import { NUTRITION_READING_POLL_MS, nutritionReadingPollInterval } from './nutrition-reading-poll';

describe('nutritionReadingPollInterval', () => {
  it('polls only while a reading is being generated', () => {
    expect(nutritionReadingPollInterval({ state: 'pending' })).toBe(NUTRITION_READING_POLL_MS);
    expect(nutritionReadingPollInterval(null)).toBe(false);
    expect(nutritionReadingPollInterval({ state: 'awaiting_day_end' })).toBe(false);
    expect(nutritionReadingPollInterval({ state: 'unavailable' })).toBe(false);
  });

  it('polls a stale reading until its refresh lands', () => {
    const ready = {
      state: 'ready' as const,
      status: 'FINAL' as const,
      generatedAt: '2026-09-11T07:00:00.000Z',
      verdict: { headline: 'x', tone: 'watch' as const },
      findings: [],
      action: { text: 'y' },
      flaggedEntries: [],
    };
    expect(nutritionReadingPollInterval({ ...ready, refreshing: true })).toBe(
      NUTRITION_READING_POLL_MS,
    );
    expect(nutritionReadingPollInterval({ ...ready, refreshing: false })).toBe(false);
  });
});
