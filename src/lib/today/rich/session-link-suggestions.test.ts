import { describe, expect, it } from 'vitest';
import {
  findSessionLinkSuggestions,
  filterDaySummaryForPendingLinkSuggestions,
  idsExcludedByLinkSuggestions,
} from './session-link-suggestions';
import {
  DEMO_LINK_ACTIVITY_TITLE,
  DEMO_SESSION_LINK_PLANNED_TITLE,
} from '@/lib/demo/demo-session-link-markers';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';

const TODAY = new Date('2026-07-03T10:00:00');

function activity(partial: Partial<ClientActivity> & { id: string }): ClientActivity {
  return {
    type: 'RUN',
    date: TODAY,
    title: 'Sortie club',
    duration: 50 * 60,
    load: 52,
    rpe: 5,
    ...partial,
  } as ClientActivity;
}

function planned(partial: Partial<ClientPlannedSession> & { id: string }): ClientPlannedSession {
  return {
    type: 'RUN',
    date: TODAY,
    title: 'Sortie course — club',
    durationMin: 50,
    intensity: 'ENDURANCE',
    load: 52,
    completed: false,
    activityId: null,
    ...partial,
  } as ClientPlannedSession;
}

describe('findSessionLinkSuggestions', () => {
  it('pairs same-day run activity with orphan planned run', () => {
    const suggestions = findSessionLinkSuggestions(
      TODAY,
      [activity({ id: 'a1' })],
      [planned({ id: 'p1' })],
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.activityId).toBe('a1');
    expect(suggestions[0]?.plannedSessionId).toBe('p1');
    expect(suggestions[0]?.score).toBeGreaterThanOrEqual(100);
  });

  it('ignores already linked pairs', () => {
    const suggestions = findSessionLinkSuggestions(
      TODAY,
      [activity({ id: 'a1', plannedSession: planned({ id: 'p1' }) as ClientPlannedSession })],
      [planned({ id: 'p1', activityId: 'a1' })],
    );

    expect(suggestions).toHaveLength(0);
  });

  it('excludes suggestion ids from day summary chips', () => {
    const suggestions = findSessionLinkSuggestions(
      TODAY,
      [activity({ id: 'a1' })],
      [planned({ id: 'p1' })],
    );
    const excluded = idsExcludedByLinkSuggestions(suggestions);

    expect(excluded.activityIds.has('a1')).toBe(true);
    expect(excluded.plannedSessionIds.has('p1')).toBe(true);
  });
});

describe('filterDaySummaryForPendingLinkSuggestions', () => {
  it('hides done and planned chips while a link suggestion is pending', () => {
    const suggestions = findSessionLinkSuggestions(
      TODAY,
      [activity({ id: 'a1', title: 'Réalisé' })],
      [planned({ id: 'p1', title: 'Prévu' })],
    );
    const lines = filterDaySummaryForPendingLinkSuggestions(
      [
        { id: 'a1', kind: 'done' as const },
        { id: 'p1', kind: 'planned' as const },
        { id: 'a2', kind: 'done' as const },
      ],
      suggestions,
    );
    expect(lines.map((l) => l.id)).toEqual(['a2']);
  });

  it('shows all chips again when the suggestion list is empty (dismissed)', () => {
    const lines = filterDaySummaryForPendingLinkSuggestions(
      [
        { id: 'a1', kind: 'done' as const },
        { id: 'p1', kind: 'planned' as const },
      ],
      [],
    );
    expect(lines).toHaveLength(2);
  });

  it('pairs demo link markers deterministically, not the next-best run', () => {
    const suggestions = findSessionLinkSuggestions(
      TODAY,
      [
        activity({ id: 'demo-act', title: DEMO_LINK_ACTIVITY_TITLE, duration: 40 * 60 }),
        activity({ id: 'other-act', title: 'Sortie longue', duration: 80 * 60 }),
      ],
      [
        planned({ id: 'demo-plan', title: DEMO_SESSION_LINK_PLANNED_TITLE, durationMin: 40 }),
        planned({ id: 'club-plan', title: 'Sortie course — club', durationMin: 50 }),
      ],
    );

    const demoPair = suggestions.find((s) => s.activityId === 'demo-act');
    expect(demoPair?.plannedSessionId).toBe('demo-plan');
    expect(demoPair?.score).toBeGreaterThanOrEqual(200);
  });
});
