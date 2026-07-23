import { describe, expect, it } from 'vitest';
import {
  filterUpcomingPlannedSessions,
  formatPlannedSessionRelativeDay,
  isUpcomingPlannedSession,
  selectUpcomingPlannedPreview,
} from './planned-session-dates';
import type { ClientPlannedSession } from '@/lib/query/types';

const FRIDAY = new Date('2026-07-03T16:00:00');
const SUNDAY = new Date('2026-07-05T00:00:00');
const FRIDAY_MORNING = new Date('2026-07-03T00:00:00');

function session(
  partial: Partial<ClientPlannedSession> & { id: string; date: Date },
): ClientPlannedSession {
  return {
    type: 'BIKE',
    title: 'Test',
    completed: false,
    activityId: null,
    ...partial,
  } as ClientPlannedSession;
}

describe('isUpcomingPlannedSession', () => {
  it('includes today when not completed', () => {
    expect(isUpcomingPlannedSession(session({ id: '1', date: FRIDAY_MORNING }), FRIDAY)).toBe(true);
  });

  it('excludes past days', () => {
    expect(
      isUpcomingPlannedSession(session({ id: '1', date: new Date('2026-07-02') }), FRIDAY),
    ).toBe(false);
  });

  it('excludes completed or linked sessions', () => {
    expect(
      isUpcomingPlannedSession(session({ id: '1', date: SUNDAY, completed: true }), FRIDAY),
    ).toBe(false);
    expect(
      isUpcomingPlannedSession(session({ id: '2', date: SUNDAY, activityId: 'act-1' }), FRIDAY),
    ).toBe(false);
  });
});

describe('formatPlannedSessionRelativeDay', () => {
  it('uses calendar days, not elapsed hours', () => {
    expect(formatPlannedSessionRelativeDay(SUNDAY, FRIDAY)).toBe('dans 2 jours');
    expect(formatPlannedSessionRelativeDay(FRIDAY_MORNING, FRIDAY)).toBe("Aujourd'hui");
    expect(formatPlannedSessionRelativeDay(new Date('2026-07-04'), FRIDAY)).toBe('Demain');
  });
});

describe('filterUpcomingPlannedSessions', () => {
  it('sorts by date ascending', () => {
    const result = filterUpcomingPlannedSessions(
      [session({ id: 'b', date: SUNDAY }), session({ id: 'a', date: FRIDAY_MORNING })],
      FRIDAY,
    );
    expect(result.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('respects horizonDays', () => {
    const nextMonday = new Date('2026-07-06T12:00:00');
    const farAway = new Date('2026-08-01T12:00:00');
    const result = filterUpcomingPlannedSessions(
      [session({ id: 'near', date: nextMonday }), session({ id: 'far', date: farAway })],
      FRIDAY,
      { horizonDays: 14 },
    );
    expect(result.map((s) => s.id)).toEqual(['near']);
  });
});

describe('selectUpcomingPlannedPreview', () => {
  it('reserves slots for next week when current week would fill the limit', () => {
    const sessions = [
      session({ id: 'sat', date: new Date('2026-07-04T12:00:00') }),
      session({ id: 'sun', date: new Date('2026-07-05T12:00:00') }),
      session({ id: 'mon', date: new Date('2026-07-06T12:00:00') }),
      session({ id: 'tue', date: new Date('2026-07-07T12:00:00') }),
      session({ id: 'wed', date: new Date('2026-07-08T12:00:00') }),
    ];
    const result = selectUpcomingPlannedPreview(sessions, FRIDAY, 4);
    expect(result.map((s) => s.id)).toEqual(['sat', 'sun', 'mon', 'tue']);
  });

  it('keeps nearest sessions on small responsive previews (not next-week reserve)', () => {
    const sessions = [
      session({ id: 'sat', date: new Date('2026-07-04T12:00:00') }),
      session({ id: 'sun', date: new Date('2026-07-05T12:00:00') }),
      session({ id: 'mon', date: new Date('2026-07-06T12:00:00') }),
      session({ id: 'tue', date: new Date('2026-07-07T12:00:00') }),
    ];
    const result = selectUpcomingPlannedPreview(sessions, FRIDAY, 2);
    expect(result.map((s) => s.id)).toEqual(['sat', 'sun']);
  });
});
