import { describe, expect, it } from 'vitest';
import {
  isJournalFieldWeightedInRecoveryV1,
  journalWeightBadgeLabel,
  JOURNAL_WEIGHT_BADGE,
  JOURNAL_RECOVERY_CALLOUT,
} from './reliability-weighting';

describe('journal reliability weighting', () => {
  it('marks morning wellness fields as weighted with Pris en compte', () => {
    for (const id of ['mood', 'energy', 'soreness', 'stress', 'metric_mood'] as const) {
      expect(isJournalFieldWeightedInRecoveryV1(id)).toBe(true);
      expect(journalWeightBadgeLabel(id)).toBe(JOURNAL_WEIGHT_BADGE.weighted);
    }
    expect(JOURNAL_WEIGHT_BADGE.weighted).toBe('Pris en compte');
  });

  it('keeps unweighted journal fields quiet (no per-line failure badge)', () => {
    for (const id of ['caffeine', 'metric_caffeine', 'hydration', 'coffee', 'mood_low'] as const) {
      expect(isJournalFieldWeightedInRecoveryV1(id)).toBe(false);
      expect(journalWeightBadgeLabel(id)).toBeNull();
    }
  });

  it('exposes a single Recovery callout without em dash', () => {
    expect(JOURNAL_RECOVERY_CALLOUT).toMatch(/Recovery lit 4 signaux matin/);
    expect(JOURNAL_RECOVERY_CALLOUT).not.toMatch(/[—–]/);
  });

  it('places the Recovery callout only at Journal header (before Analyses toolbar)', async () => {
    const { readFile } = await import('node:fs/promises');
    const screen = await readFile(
      new URL('../../components/journal/journal-screen.tsx', import.meta.url),
      'utf8',
    );
    const calloutAt = screen.indexOf('<JournalRecoveryCallout');
    const toolbarAt = screen.indexOf('<JournalScreenToolbar');
    expect(calloutAt).toBeGreaterThan(-1);
    expect(toolbarAt).toBeGreaterThan(-1);
    expect(calloutAt).toBeLessThan(toolbarAt);
    expect(screen.match(/<JournalRecoveryCallout/g)).toHaveLength(1);
  });
});
