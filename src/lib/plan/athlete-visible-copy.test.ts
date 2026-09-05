import { describe, expect, it } from 'vitest';
import { athleteVisibleCopy } from '@/lib/plan/athlete-visible-copy';

describe('athleteVisibleCopy', () => {
  it('replaces an em dash with a middle dot', () => {
    expect(athleteVisibleCopy('Vigilance — sommeil')).toBe('Vigilance · sommeil');
  });
});
