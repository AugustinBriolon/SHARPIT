import { describe, expect, it } from 'vitest';
import { formatSplitDeltaAccessible, splitPaceBarPercent } from './rhythm-splits-helpers';

describe('splitPaceBarPercent', () => {
  it('maps fastest pace to full bar and slowest near the floor', () => {
    expect(splitPaceBarPercent(300, 300, 400)).toBe(100);
    expect(splitPaceBarPercent(400, 300, 400)).toBe(28);
  });

  it('returns 0 when pace is missing', () => {
    expect(splitPaceBarPercent(null, 300, 400)).toBe(0);
  });

  it('returns 100 when min equals max', () => {
    expect(splitPaceBarPercent(350, 350, 350)).toBe(100);
  });
});

describe('formatSplitDeltaAccessible', () => {
  it('includes direction in text so color is not the only cue', () => {
    expect(formatSplitDeltaAccessible({ pct: 10, faster: true })).toContain('plus rapide');
    expect(formatSplitDeltaAccessible({ pct: 13, faster: false })).toContain('plus lent');
  });
});
