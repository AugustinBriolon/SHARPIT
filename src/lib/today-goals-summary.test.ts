import { describe, expect, it } from 'vitest';
import { GoalKind, GoalPriority } from '@prisma/client';
import { selectTodayGoals } from './today-goals-summary';
import type { ClientGoal } from '@/lib/query/types';

function goal(partial: Partial<ClientGoal> & { id: string; title: string }): ClientGoal {
  return {
    kind: GoalKind.METRIC,
    horizon: null,
    metricKey: null,
    startValue: null,
    currentValue: null,
    targetValue: null,
    unit: null,
    lowerIsBetter: false,
    targetDate: null,
    location: null,
    achieved: false,
    notes: null,
    priority: null,
    raceFormat: null,
    targetPerformance: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as ClientGoal;
}

describe('selectTodayGoals', () => {
  it('prioritises race A with nearest date', () => {
    const lines = selectTodayGoals([
      goal({
        id: 'm1',
        title: 'Natation hebdo',
        kind: GoalKind.METRIC,
        currentValue: 2,
        targetValue: 4,
        unit: 'séances',
      }),
      goal({
        id: 'r2',
        title: 'Marathon',
        kind: GoalKind.RACE,
        priority: GoalPriority.B,
        targetDate: new Date('2026-12-01'),
        targetPerformance: 'Sub 4h',
      }),
      goal({
        id: 'r1',
        title: 'Semi',
        kind: GoalKind.RACE,
        priority: GoalPriority.A,
        targetDate: new Date('2026-08-01'),
        targetPerformance: 'Sub 1h45',
      }),
    ]);

    expect(lines[0]?.id).toBe('r1');
    expect(lines[0]?.badge).toMatch(/^J-/);
    expect(lines[1]?.id).toBe('r2');
  });

  it('excludes achieved goals', () => {
    const lines = selectTodayGoals([
      goal({ id: 'done', title: 'Fini', achieved: true }),
      goal({ id: 'open', title: 'En cours', kind: GoalKind.RACE, priority: GoalPriority.A }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.id).toBe('open');
  });
});
