import { describe, expect, it } from 'vitest';
import {
  isJournalFieldWeightedInRecoveryV1,
  journalWeightBadgeLabel,
  JOURNAL_WEIGHT_BADGE,
} from './reliability-weighting';

describe('journal reliability weighting', () => {
  it('marks morning wellness fields as weighted', () => {
    for (const id of ['mood', 'energy', 'soreness', 'stress', 'metric_mood'] as const) {
      expect(isJournalFieldWeightedInRecoveryV1(id)).toBe(true);
      expect(journalWeightBadgeLabel(id)).toBe(JOURNAL_WEIGHT_BADGE.weighted);
    }
  });

  it('marks other journal fields as noted but not weighted', () => {
    for (const id of ['caffeine', 'metric_caffeine', 'hydration', 'coffee', 'mood_low'] as const) {
      expect(isJournalFieldWeightedInRecoveryV1(id)).toBe(false);
      expect(journalWeightBadgeLabel(id)).toBe(JOURNAL_WEIGHT_BADGE.notedNotWeighted);
    }
  });
});
