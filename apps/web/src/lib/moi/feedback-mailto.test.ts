import { describe, expect, it } from 'vitest';
import { FEEDBACK_BUG_MAILTO, FEEDBACK_FEATURE_MAILTO } from '@/lib/moi/feedback-mailto';

describe('feedback-mailto', () => {
  it('builds mailto links for feature request and bug report', () => {
    expect(FEEDBACK_FEATURE_MAILTO).toMatch(/^mailto:augustin\.briolon@gmail\.com\?/);
    expect(FEEDBACK_FEATURE_MAILTO).toContain(encodeURIComponent('SHARPIT — demande'));
    expect(FEEDBACK_BUG_MAILTO).toContain(encodeURIComponent('SHARPIT — bug'));
  });
});
