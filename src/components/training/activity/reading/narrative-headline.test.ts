import { describe, expect, it } from 'vitest';
import { readNarrativeHeadline } from './narrative-headline';

describe('readNarrativeHeadline', () => {
  it('returns a trimmed headline from narrative JSON', () => {
    expect(readNarrativeHeadline({ headline: '  Sortie maîtrisée  ', narrative: '…' })).toBe(
      'Sortie maîtrisée',
    );
  });

  it('returns null for missing or empty headline', () => {
    expect(readNarrativeHeadline(null)).toBeNull();
    expect(readNarrativeHeadline({})).toBeNull();
    expect(readNarrativeHeadline({ headline: '  ' })).toBeNull();
  });
});
