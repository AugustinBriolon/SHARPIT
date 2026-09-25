import { describe, expect, it } from 'vitest';
import { journalPrefsDeepLinkFilter } from './journal-trackables';

describe('journalPrefsDeepLinkFilter', () => {
  it('reads a known filter from the query', () => {
    expect(journalPrefsDeepLinkFilter('?personnaliser=nutrition')).toBe('nutrition');
    expect(journalPrefsDeepLinkFilter('?date=2026-09-10&personnaliser=sommeil')).toBe('sommeil');
  });

  it('ignores a missing or unknown filter', () => {
    expect(journalPrefsDeepLinkFilter('')).toBeNull();
    expect(journalPrefsDeepLinkFilter('?personnaliser=inconnu')).toBeNull();
  });
});
