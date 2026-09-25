import { describe, expect, it } from 'vitest';
import {
  buildDiscussContext,
  buildDiscussIntentKey,
  isDiscussBootstrapPending,
  isDiscussDataReady,
} from '@/components/coach/discuss/coach-view-discuss';
import { coachDiscussMetadata } from '@/lib/coach/chat/discuss/coach-discuss-context';

const NO_INTENT = {
  discussToday: false,
  discussJournalAnalyses: false,
  discussGoalId: null,
  discussConditionId: null,
  discussRecordKey: null,
  discussPlanningHorizon: null,
  discussId: null,
  discussActivityId: null,
};

const NOTHING_LOADED = {
  goals: [],
  physicalNotes: [],
  records: undefined,
  projectionVisible: false,
  plannedSessions: [],
  activities: [],
  todayLoaded: false,
};

const NOTHING_PENDING = {
  todayPending: false,
  goalsPending: false,
  physicalNotesPending: false,
  recordsPending: false,
  projectionPending: false,
  plannedPending: false,
  activitiesPending: false,
};

function sources(overrides: Partial<Parameters<typeof buildDiscussContext>[0]> = {}) {
  return { ...NO_INTENT, ...NOTHING_LOADED, ...overrides };
}

const RECORDS = {
  prs: {
    run: [{ key: 'run-distance', label: 'Plus longue sortie', entries: [] }],
    bike: [],
    swim: [],
  },
};

describe('buildDiscussContext', () => {
  it.each([
    [{ discussGoalId: 'g-1', goals: [{ id: 'g-1', title: 'Half' }] }, { goalId: 'g-1' }, 'goal'],
    [
      { discussConditionId: 'n-1', physicalNotes: [{ id: 'n-1', title: 'Genou' }] },
      { noteId: 'n-1' },
      'physical-condition',
    ],
    [
      { discussRecordKey: 'run-distance', records: RECORDS },
      { categoryKey: 'run-distance' },
      'record',
    ],
    [{ discussPlanningHorizon: 3 as const }, { horizonDays: 3 }, 'planning'],
    [
      { discussId: 's-1', plannedSessions: [{ id: 's-1', title: 'Seuil' }] },
      { sessionId: 's-1' },
      'planned-session',
    ],
    [
      { discussActivityId: 'a-1', activities: [{ id: 'a-1', title: 'Sortie' }] },
      { activityId: 'a-1' },
      'activity',
    ],
  ])('keeps the target so the message can carry it (%#)', (params, targetFields, kind) => {
    const context = buildDiscussContext(sources(params));

    expect(context?.target).toEqual({ kind, ...targetFields });
    expect(coachDiscussMetadata(context)).toEqual({ discussKind: kind, ...targetFields });
  });

  it('names the chip from the loaded data', () => {
    expect(
      buildDiscussContext(sources({ discussRecordKey: 'run-distance', records: RECORDS }))?.label,
    ).toBe('Records · Plus longue sortie · course');
  });

  it('follows deep-link precedence when several params are set', () => {
    const context = buildDiscussContext(sources({ discussToday: true, discussGoalId: 'g-1' }));

    expect(context?.target).toEqual({ kind: 'today' });
  });

  it('returns nothing without a discuss intent', () => {
    expect(buildDiscussContext(sources())).toBeNull();
    expect(buildDiscussIntentKey(NO_INTENT)).toBeNull();
  });
});

describe('discuss bootstrap readiness', () => {
  it('waits for the query that names the target', () => {
    const waiting = {
      ...sources({ discussGoalId: 'g-1' }),
      ...NOTHING_PENDING,
      goalsPending: true,
    };

    expect(isDiscussDataReady(waiting)).toBe(false);
    expect(isDiscussBootstrapPending(waiting)).toBe(true);
    expect(
      isDiscussBootstrapPending({ ...waiting, goals: [{ id: 'g-1' }], goalsPending: false }),
    ).toBe(false);
  });

  it('does not wait on anything for journal analyses', () => {
    const journal = { ...sources({ discussJournalAnalyses: true }), ...NOTHING_PENDING };

    expect(isDiscussDataReady(journal)).toBe(true);
    expect(isDiscussBootstrapPending(journal)).toBe(false);
  });

  it('keys each intent by kind and target', () => {
    expect(buildDiscussIntentKey({ ...NO_INTENT, discussActivityId: 'a-1' })).toBe('activity:a-1');
    expect(buildDiscussIntentKey({ ...NO_INTENT, discussPlanningHorizon: 14 })).toBe('planning:14');
  });
});
