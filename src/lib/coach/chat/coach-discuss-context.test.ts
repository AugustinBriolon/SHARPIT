import { describe, expect, it } from 'vitest';
import { coachDiscussHref } from '@/lib/coach/chat/coach-discuss-href';
import { describeCoachDiscussContext } from '@/lib/coach/chat/coach-discuss-context';

describe('coachDiscussHref', () => {
  it('builds a link for every athlete surface the IA names', () => {
    expect(coachDiscussHref({ kind: 'today' })).toBe('/coach?discussToday=1');
    expect(coachDiscussHref({ kind: 'goal', goalId: 'g-1' })).toBe('/coach?discussGoal=g-1');
    expect(coachDiscussHref({ kind: 'record', categoryKey: 'run-5k' })).toBe(
      '/coach?discussRecord=run-5k',
    );
    expect(coachDiscussHref({ kind: 'physical-condition', noteId: 'n-1' })).toBe(
      '/coach?discussCondition=n-1',
    );
  });

  it('encodes ids that would otherwise break the query string', () => {
    expect(coachDiscussHref({ kind: 'goal', goalId: 'a b&c' })).toBe(
      '/coach?discussGoal=a%20b%26c',
    );
  });
});

describe('describeCoachDiscussContext', () => {
  it('names the attachment in plain language', () => {
    expect(describeCoachDiscussContext({ kind: 'today' }).label).toBe('Ton état du jour');
    expect(describeCoachDiscussContext({ kind: 'goal', goalId: 'g' }, 'Half IronMan').label).toBe(
      'Objectif · Half IronMan',
    );
    expect(describeCoachDiscussContext({ kind: 'planning', horizonDays: 7 }).label).toBe(
      'Ta semaine · les 7 prochains jours',
    );
  });

  it('degrades to the kind rather than inventing a name', () => {
    expect(describeCoachDiscussContext({ kind: 'goal', goalId: 'g' }).label).toBe('Un objectif');
    expect(describeCoachDiscussContext({ kind: 'goal', goalId: 'g' }, '   ').label).toBe(
      'Un objectif',
    );
  });

  it('points back at the surface the context came from', () => {
    expect(describeCoachDiscussContext({ kind: 'activity', activityId: 'a-1' }).sourceHref).toBe(
      '/training/a-1',
    );
    expect(describeCoachDiscussContext({ kind: 'record', categoryKey: 'k' }).sourceHref).toBe(
      '/moi/performance',
    );
  });
});
