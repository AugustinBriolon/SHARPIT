import { describe, expect, it } from 'vitest';
import { GoalKind, GoalPriority } from '@prisma/client';
import { buildGoalCapHero, partitionGoalsForCap } from '@sharpit/server/lib/goals/goal-cap';
import type { PlanGoalView } from '@sharpit/server/lib/plan/trajectory/plan-goal';

function raceGoal(overrides: Partial<PlanGoalView> = {}): PlanGoalView {
  return {
    id: 'goal-race',
    title: 'Semi Paris',
    countdown: 'J-28',
    countdownCaption: 'jours restants',
    detail: 'Sub 1h30',
    progress: null,
    targetDate: new Date(2026, 9, 10),
    isRace: true,
    ...overrides,
  };
}

describe('partitionGoalsForCap', () => {
  const goals = [
    {
      id: 'goal-race',
      title: 'Semi Paris',
      kind: GoalKind.RACE,
      priority: GoalPriority.A,
    },
    {
      id: 'goal-metric',
      title: 'Volume hebdo',
      kind: GoalKind.METRIC,
      priority: GoalPriority.B,
    },
  ];

  it('lifts the primary id into Cap and leaves the rest as inventory', () => {
    expect(partitionGoalsForCap(goals, 'goal-race')).toEqual({
      primaryId: 'goal-race',
      inventory: [goals[1]],
    });
  });

  it('returns empty Cap when there is no primary', () => {
    expect(partitionGoalsForCap(goals, null)).toEqual({
      primaryId: null,
      inventory: goals,
    });
  });
});

describe('buildGoalCapHero', () => {
  it('builds identity from the plan goal', () => {
    expect(buildGoalCapHero({ goal: raceGoal(), phaseLabel: 'Affûtage' })).toEqual({
      goalId: 'goal-race',
      title: 'Semi Paris',
      eyebrow: 'Cap',
      countdown: 'J-28',
      countdownCaption: 'jours restants',
      detail: 'Sub 1h30',
      progress: null,
      phaseLabel: 'Affûtage',
      isRace: true,
    });
  });
});
