import { describe, expect, it } from 'vitest';
import { coachDiscussHref } from '@sharpit/server/lib/coach/chat/discuss/coach-discuss-href';

describe('coachDiscussHref', () => {
  it('builds planned-session, activity and planning links', () => {
    expect(coachDiscussHref({ kind: 'planned-session', sessionId: 'abc' })).toBe(
      '/coach?discuss=abc',
    );
    expect(coachDiscussHref({ kind: 'activity', activityId: 'act-1' })).toBe(
      '/coach?discussActivity=act-1',
    );
    expect(coachDiscussHref({ kind: 'planning', horizonDays: 7 })).toBe('/coach?discussPlanning=7');
  });
});
