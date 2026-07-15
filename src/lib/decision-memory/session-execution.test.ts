import { describe, expect, it } from 'vitest';
import { deriveSessionExecutionState } from './session-execution';

const NOW = new Date('2026-07-15T12:00:00.000Z');

describe('deriveSessionExecutionState', () => {
  it('is NOT_SCHEDULED when no session was ever created', () => {
    expect(deriveSessionExecutionState(null, NOW, false)).toBe('NOT_SCHEDULED');
  });

  it('is SUPERSEDED when a session existed but no longer resolves (e.g. removed via adapt)', () => {
    expect(deriveSessionExecutionState(null, NOW, true)).toBe('SUPERSEDED');
  });

  it('is COMPLETED when completed and linked to an activity', () => {
    const session = {
      completed: true,
      activityId: 'act-1',
      date: new Date('2026-07-14T08:00:00Z'),
    };
    expect(deriveSessionExecutionState(session, NOW, true)).toBe('COMPLETED');
  });

  it('is SCHEDULED when not completed and the date is in the future', () => {
    const session = { completed: false, activityId: null, date: new Date('2026-07-16T08:00:00Z') };
    expect(deriveSessionExecutionState(session, NOW, true)).toBe('SCHEDULED');
  });

  it('is SCHEDULED when not completed and less than 72h in the past', () => {
    const session = { completed: false, activityId: null, date: new Date('2026-07-13T08:00:00Z') };
    expect(deriveSessionExecutionState(session, NOW, true)).toBe('SCHEDULED');
  });

  it('is SKIPPED when not completed and more than 72h in the past', () => {
    const session = { completed: false, activityId: null, date: new Date('2026-07-10T08:00:00Z') };
    expect(deriveSessionExecutionState(session, NOW, true)).toBe('SKIPPED');
  });

  it('never reports COMPLETED without both completed=true and an activityId — this inconsistent state (completed=true, no activity) shouldn\'t occur in practice, but the function must not misreport it as COMPLETED, and "completed" also excludes it from SKIPPED regardless of age', () => {
    const recent = { completed: true, activityId: null, date: new Date('2026-07-14T08:00:00Z') };
    expect(deriveSessionExecutionState(recent, NOW, true)).toBe('SCHEDULED');
    const old = { completed: true, activityId: null, date: new Date('2026-07-10T08:00:00Z') };
    expect(deriveSessionExecutionState(old, NOW, true)).toBe('SCHEDULED');
  });
});
