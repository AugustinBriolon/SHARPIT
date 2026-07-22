import { describe, expect, it } from 'vitest';
import {
  applyActivityPlannedSessionLinkOptimistic,
  applyPlannedSessionLinkOptimistic,
  resolvePreviousLinkedActivityId,
} from '@/lib/query/planned-session-link-optimistic';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';

function session(overrides: Partial<ClientPlannedSession> & { id: string }): ClientPlannedSession {
  return {
    title: 'Seuil',
    type: 'BIKE',
    date: new Date('2026-07-22T08:00:00Z'),
    activityId: 'act-1',
    activity: { id: 'act-1', title: 'Ride' },
    completed: true,
    analysis: { complianceScore: 80 },
    analyzedAt: new Date('2026-07-22T10:00:00Z'),
    durationMin: 60,
    description: null,
    intensity: 'THRESHOLD',
    ...overrides,
  } as unknown as ClientPlannedSession;
}

describe('applyPlannedSessionLinkOptimistic', () => {
  it('clears nested activity and analysis on unlink', () => {
    const patched = applyPlannedSessionLinkOptimistic(
      [session({ id: 'ps-1' })],
      { id: 'ps-1', activityId: null },
      undefined,
    );
    expect(patched[0]?.activityId).toBeNull();
    expect(patched[0]?.activity).toBeNull();
    expect(patched[0]?.completed).toBe(false);
    expect(patched[0]?.analysis).toBeNull();
    expect(patched[0]?.analyzedAt).toBeNull();
  });

  it('attaches activity from cache on link', () => {
    const activities = [{ id: 'act-2', title: 'New ride' }] as unknown as ClientActivity[];
    const patched = applyPlannedSessionLinkOptimistic(
      [session({ id: 'ps-1', activityId: null, activity: null, completed: false, analysis: null })],
      { id: 'ps-1', activityId: 'act-2' },
      activities,
    );
    expect(patched[0]?.activityId).toBe('act-2');
    expect(patched[0]?.activity?.id).toBe('act-2');
    expect(patched[0]?.completed).toBe(true);
  });
});

describe('applyActivityPlannedSessionLinkOptimistic', () => {
  it('clears plannedSession on previously linked activity', () => {
    const activities = [
      {
        id: 'act-1',
        plannedSession: { id: 'ps-1', title: 'Seuil' },
      },
    ] as unknown as ClientActivity[];
    const patched = applyActivityPlannedSessionLinkOptimistic(
      activities,
      [session({ id: 'ps-1' })],
      { id: 'ps-1', activityId: null },
      'act-1',
    );
    expect(patched[0]?.plannedSession).toBeNull();
  });
});

describe('resolvePreviousLinkedActivityId', () => {
  it('reads activityId or nested activity id', () => {
    expect(resolvePreviousLinkedActivityId(session({ id: 'ps-1' }))).toBe('act-1');
    expect(
      resolvePreviousLinkedActivityId(
        session({ id: 'ps-1', activityId: null, activity: { id: 'act-9' } as never }),
      ),
    ).toBe('act-9');
  });
});
