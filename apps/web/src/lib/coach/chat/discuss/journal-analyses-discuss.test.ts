import { describe, expect, it } from 'vitest';
import { coachDiscussHref } from '@/lib/coach/chat/discuss/coach-discuss-href';
import {
  coachDiscussMetadata,
  describeCoachDiscussContext,
} from '@/lib/coach/chat/discuss/coach-discuss-context';

describe('journal analyses discuss', () => {
  it('builds href and chip label without composer prefill', () => {
    expect(coachDiscussHref({ kind: 'journal-analyses' })).toBe('/coach?discussJournalAnalyses=1');
    expect(describeCoachDiscussContext({ kind: 'journal-analyses' })).toEqual({
      kind: 'journal-analyses',
      target: { kind: 'journal-analyses' },
      label: 'Analyses journal',
      sourceHref: '/journal/analyses',
    });
  });

  it('tags the outgoing message with the discuss kind', () => {
    expect(coachDiscussMetadata(describeCoachDiscussContext({ kind: 'journal-analyses' }))).toEqual(
      {
        discussKind: 'journal-analyses',
      },
    );
    expect(coachDiscussMetadata(null)).toBeUndefined();
  });
});
