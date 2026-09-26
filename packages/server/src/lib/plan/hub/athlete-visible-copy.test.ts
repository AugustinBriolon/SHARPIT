import { describe, expect, it } from 'vitest';
import { athleteVisibleCopy } from '@sharpit/server/lib/plan/hub/athlete-visible-copy';

describe('athleteVisibleCopy', () => {
  it('replaces an em dash with a middle dot', () => {
    expect(athleteVisibleCopy('Vigilance — sommeil')).toBe('Vigilance · sommeil');
  });
});
