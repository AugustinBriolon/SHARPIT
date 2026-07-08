import { GoalKind, GoalPriority } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { resolveTodayGoalContext } from '@/lib/daily-phase/goal-context';
import type { ClientGoal } from '@/lib/query/types';

function raceGoal(overrides: Partial<ClientGoal> = {}): ClientGoal {
  return {
    id: 'goal-1',
    title: 'Semi Paris',
    kind: GoalKind.RACE,
    priority: GoalPriority.A,
    targetDate: new Date('2026-08-15'),
    targetPerformance: null,
    achieved: false,
    currentValue: null,
    targetValue: null,
    unit: null,
    metricKey: null,
    ...overrides,
  } as ClientGoal;
}

describe('resolveTodayGoalContext', () => {
  it('prioritises goal linked to today planned session', () => {
    const goals = [
      raceGoal({ id: 'g-a', title: 'Hyrox Paris' }),
      raceGoal({ id: 'g-b', title: 'Semi Lyon', priority: GoalPriority.B }),
    ];

    const ctx = resolveTodayGoalContext(
      goals,
      [
        {
          date: new Date('2026-07-08T12:00:00'),
          goalId: 'g-b',
          completed: false,
        },
      ],
      '2026-07-08',
    );

    expect(ctx?.goalId).toBe('g-b');
    expect(ctx?.linkedToTodaySession).toBe(true);
    expect(ctx?.title).toBe('Semi Lyon');
  });

  it('falls back to primary active goal when no session link', () => {
    const goals = [
      raceGoal({ id: 'g-a', title: 'Hyrox Paris' }),
      raceGoal({ id: 'g-b', title: 'Semi Lyon', priority: GoalPriority.B }),
    ];

    const ctx = resolveTodayGoalContext(goals, [], '2026-07-08');

    expect(ctx?.goalId).toBe('g-a');
    expect(ctx?.linkedToTodaySession).toBe(false);
    expect(ctx?.isPrimaryRace).toBe(true);
  });
});
