import { describe, expect, it } from 'vitest';
import { buildGoalCapStats } from '@sharpit/server/lib/goals/goal-cap-stats';

const START = new Date(Date.UTC(2026, 8, 1));
const NOW = new Date(2026, 8, 14, 12, 0, 0);

function session(overrides: {
  id: string;
  goalId?: string | null;
  date: string;
  completed?: boolean;
  activityId?: string | null;
  durationMin?: number | null;
  load?: number | null;
  type?: 'RUN' | 'BIKE' | null;
}) {
  return {
    id: overrides.id,
    goalId: overrides.goalId ?? 'goal-1',
    date: new Date(`${overrides.date}T00:00:00.000Z`),
    completed: overrides.completed ?? false,
    activityId: overrides.activityId ?? null,
    durationMin: overrides.durationMin ?? null,
    load: overrides.load ?? null,
    type: overrides.type ?? 'RUN',
  };
}

function activity(id: string, durationSec: number, load: number | null = null) {
  return { id, duration: durationSec, load };
}

describe('buildGoalCapStats', () => {
  it('returns empty zeros when no sessions are stamped to the goal', () => {
    expect(
      buildGoalCapStats({
        goalId: 'goal-1',
        goalCreatedAt: START,
        now: NOW,
        sessions: [session({ id: 's1', goalId: 'other', date: '2026-09-10', completed: true })],
        activities: [],
      }),
    ).toMatchObject({
      sessionsDone: 0,
      sportShares: [],
      hasLinkedSessions: false,
    });
  });

  it('aggregates volume and sport shares without per-session history', () => {
    const view = buildGoalCapStats({
      goalId: 'goal-1',
      goalCreatedAt: START,
      now: NOW,
      sessions: [
        session({
          id: 'done-linked',
          date: '2026-09-05',
          completed: true,
          activityId: 'a1',
          durationMin: 90,
          load: 80,
          type: 'RUN',
        }),
        session({
          id: 'done-bike',
          date: '2026-09-08',
          completed: true,
          durationMin: 45,
          load: 40,
          type: 'BIKE',
        }),
        session({ id: 'remaining', date: '2026-09-18', durationMin: 60 }),
      ],
      activities: [activity('a1', 5400, 72)],
    });

    expect(view.sessionsDone).toBe(2);
    expect(view.durationLabel).toBe('2h15');
    expect(view.loadTotal).toBe(112);
    expect(view.sportShares).toEqual([
      expect.objectContaining({ type: 'RUN', sessionSharePct: 50, durationSharePct: 67 }),
      expect.objectContaining({ type: 'BIKE', sessionSharePct: 50, durationSharePct: 33 }),
    ]);
    expect(view).not.toHaveProperty('doneRows');
  });
});
