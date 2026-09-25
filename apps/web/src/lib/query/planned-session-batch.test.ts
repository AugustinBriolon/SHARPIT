import { describe, expect, it } from 'vitest';
import {
  applyPlannedSessionBatchOps,
  plannedSessionBatchSuccessMessage,
  type PlannedSessionBatchOp,
} from '@/lib/query/planned-session-batch';
import type { ClientPlannedSession } from '@/lib/query/types';
import { isTempId } from '@/lib/query/optimistic';

function session(partial: Partial<ClientPlannedSession> & { id: string }): ClientPlannedSession {
  return {
    type: 'RUN',
    date: new Date('2026-07-20T12:00:00'),
    startTime: null,
    title: 'Base',
    description: null,
    durationMin: 45,
    load: 40,
    intensity: 'ENDURANCE',
    completed: false,
    goalId: null,
    brickGroupId: null,
    brickOrder: null,
    activityId: null,
    analysis: null,
    analyzedAt: null,
    googleEventId: null,
    garminWorkoutId: null,
    garminWorkoutScheduledDate: null,
    garminWorkoutPushedAt: null,
    createdAt: new Date('2026-07-01'),
    updatedAt: new Date('2026-07-01'),
    activity: null,
    ...partial,
  } as ClientPlannedSession;
}

describe('applyPlannedSessionBatchOps', () => {
  it('applies create, update, and remove in one pass', () => {
    const prev = [
      session({ id: 'a', title: 'Keep' }),
      session({ id: 'b', title: 'Remove me' }),
      session({ id: 'c', title: 'Old title', durationMin: 30 }),
    ];

    const ops: PlannedSessionBatchOp[] = [
      { op: 'remove', id: 'b' },
      {
        op: 'update',
        id: 'c',
        data: { title: 'New title', durationMin: 60 },
      },
      {
        op: 'create',
        payload: {
          type: 'BIKE',
          date: new Date('2026-07-22T12:00:00'),
          title: 'Added',
          durationMin: 90,
        },
      },
    ];

    const next = applyPlannedSessionBatchOps(prev, ops);

    expect(next.map((s) => s.id)).toEqual(
      expect.arrayContaining(['a', 'c', expect.stringMatching(/^optimistic-/)]),
    );
    expect(next.find((s) => s.id === 'b')).toBeUndefined();
    expect(next.find((s) => s.id === 'c')?.title).toBe('New title');
    expect(next.find((s) => s.id === 'c')?.durationMin).toBe(60);
    const created = next.find((s) => isTempId(s.id));
    expect(created?.title).toBe('Added');
    expect(created?.type).toBe('BIKE');
  });
});

describe('plannedSessionBatchSuccessMessage', () => {
  it('returns a single global message for the batch size', () => {
    expect(plannedSessionBatchSuccessMessage([])).toBe('Planning mis à jour');
    expect(plannedSessionBatchSuccessMessage([{ op: 'remove', id: 'a' }])).toBe(
      '1 ajustement appliqué',
    );
    expect(
      plannedSessionBatchSuccessMessage([
        { op: 'remove', id: 'a' },
        { op: 'remove', id: 'b' },
        { op: 'remove', id: 'c' },
      ]),
    ).toBe('3 ajustements appliqués');
  });
});
