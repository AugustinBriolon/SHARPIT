import { describe, expect, it } from 'vitest';
import { GoalKind, GoalPriority } from '@prisma/client';
import { resolveAdaptGoalLabel } from '@/lib/plan/resolve-adapt-goal-label';
import type { ClientGoal } from '@/lib/query/types';

const NOW = new Date(2026, 8, 12, 12, 0, 0);

function goal(overrides: Partial<ClientGoal> & Pick<ClientGoal, 'id' | 'title'>): ClientGoal {
  return {
    kind: GoalKind.RACE,
    priority: GoalPriority.A,
    targetDate: new Date(2026, 9, 10),
    raceFormat: 'SEMI',
    targetPerformance: 'Sub 1h30',
    achieved: false,
    currentValue: null,
    targetValue: null,
    unit: null,
    metricKey: null,
    ...overrides,
  } as ClientGoal;
}

describe('resolveAdaptGoalLabel', () => {
  it('returns null when goals are missing', () => {
    expect(
      resolveAdaptGoalLabel({
        goals: undefined,
        planGoalId: 'g1',
        now: NOW,
      }),
    ).toBeNull();
  });

  it('prefers the plan goal title when present', () => {
    const goals = [
      goal({ id: 'g-other', title: 'Other', priority: GoalPriority.B }),
      goal({ id: 'g-plan', title: 'Semi Paris', priority: GoalPriority.A }),
    ];
    expect(
      resolveAdaptGoalLabel({
        goals,
        planGoalId: 'g-plan',
        now: NOW,
      }),
    ).toBe('Semi Paris');
  });

  it('falls back to selectPlanGoal when planGoalId misses the list', () => {
    const goals = [goal({ id: 'g1', title: '  10K  ' })];
    expect(
      resolveAdaptGoalLabel({
        goals,
        planGoalId: 'missing',
        now: NOW,
      }),
    ).toBe('10K');
  });

  it('falls back to selectPlanGoal when planGoalId is absent', () => {
    const goals = [goal({ id: 'g1', title: '5 km sous 20′' })];
    expect(
      resolveAdaptGoalLabel({
        goals,
        planGoalId: null,
        now: NOW,
      }),
    ).toBe('5 km sous 20′');
  });
});
