import { describe, expect, it } from 'vitest';
import { computeProactiveActions } from './proactive-coach';
import type { ClientPhysicalNote, ClientPlannedSession } from './client/types';

const REF = new Date('2026-01-31T12:00:00');

function session(partial: Partial<ClientPlannedSession>): ClientPlannedSession {
  return {
    id: 's1',
    date: REF,
    title: 'Séance',
    intensity: 'THRESHOLD',
    load: 100,
    description: null,
    completed: false,
    activityId: null,
    ...(partial as object),
  } as unknown as ClientPlannedSession;
}

function note(partial: Partial<ClientPhysicalNote>): ClientPhysicalNote {
  return {
    id: 'n1',
    title: 'Note',
    category: 'PAIN',
    severity: 6,
    status: 'ACTIVE',
    updatedAt: REF,
    checkins: [],
    ...(partial as object),
  } as unknown as ClientPhysicalNote;
}

const BASE = {
  refDate: REF,
  activities: [],
  health: [],
  physicalNotes: [],
  plannedSessions: [],
  trainingPlan: null,
  alerts: [],
  acwr: 1,
  readinessScore: null,
  tsb: null,
};

describe('computeProactiveActions', () => {
  it('ne propose rien quand tout est nominal', () => {
    expect(computeProactiveActions(BASE)).toEqual([]);
  });

  it("propose d'alléger une séance dure quand la readiness est basse", () => {
    const actions = computeProactiveActions({
      ...BASE,
      readinessScore: 30,
      plannedSessions: [session({ id: 'hard', intensity: 'VO2MAX', date: REF })],
    });
    const downgrade = actions.find((a) => a.kind === 'downgrade_session');
    expect(downgrade).toBeDefined();
    expect(downgrade!.sessionId).toBe('hard');
  });

  it('ne déclenche PAS de protection pour une posture (≠ douleur)', () => {
    const actions = computeProactiveActions({
      ...BASE,
      physicalNotes: [note({ category: 'POSTURE', severity: 8 })],
      plannedSessions: [session({ id: 'hard', intensity: 'THRESHOLD', date: REF })],
    });
    expect(actions.some((a) => a.id.startsWith('adapt-pain'))).toBe(false);
  });

  it('protège une douleur sévère avec séance intense imminente', () => {
    const actions = computeProactiveActions({
      ...BASE,
      physicalNotes: [note({ id: 'p', category: 'PAIN', severity: 8 })],
      plannedSessions: [session({ id: 'hard', intensity: 'THRESHOLD', date: REF })],
    });
    expect(actions.some((a) => a.id === 'adapt-pain-p')).toBe(true);
  });

  it('suggère de rattacher une séance passée non liée', () => {
    const past = new Date(REF.getTime() - 24 * 3600 * 1000);
    const actions = computeProactiveActions({
      ...BASE,
      plannedSessions: [
        session({ id: 'old', intensity: 'ENDURANCE', date: past, activityId: null }),
      ],
    });
    expect(actions.some((a) => a.kind === 'link_session')).toBe(true);
  });

  it('plafonne à 6 actions', () => {
    const actions = computeProactiveActions({
      ...BASE,
      acwr: 2,
      tsb: -40,
      readinessScore: 20,
    });
    expect(actions.length).toBeLessThanOrEqual(6);
  });
});
