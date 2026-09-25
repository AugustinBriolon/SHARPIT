import { GoalKind, GoalPriority } from '@prisma/client';
import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import type { ClientGoal } from '@/lib/query/types';
import {
  buildTodayGoalAnchor,
  goalDeepLinkHref,
  goalDomId,
} from '@/lib/today/rich/today-goal-anchor';

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

describe('today-goal-anchor', () => {
  it('builds deep-link href and dom id', () => {
    expect(goalDomId('abc')).toBe('goal-abc');
    expect(goalDeepLinkHref('abc')).toBe('/moi/objectifs#goal-abc');
  });

  it('returns null when no active goal', () => {
    expect(
      buildTodayGoalAnchor({
        goals: [],
        plannedSessions: [],
        trainingDayId: format(new Date(), 'yyyy-MM-dd'),
        narrativeGoalLine: null,
      }),
    ).toBeNull();
  });

  it('prefers narrative goalLine and marks session link', () => {
    const day = new Date();
    const trainingDayId = format(day, 'yyyy-MM-dd');
    const targetDate = new Date();
    targetDate.setUTCDate(targetDate.getUTCDate() + 30);
    const goals = [raceGoal({ id: 'g1', title: 'Ironman 70.3', targetDate })];

    const anchor = buildTodayGoalAnchor({
      goals,
      plannedSessions: [{ date: day, goalId: 'g1', completed: false }],
      trainingDayId,
      narrativeGoalLine: 'Ironman 70.3 · J-30',
    });

    expect(anchor).toEqual({
      goalId: 'g1',
      label: 'Ironman 70.3 · J-30',
      href: '/moi/objectifs#goal-g1',
      linkedToSession: true,
    });
  });

  it('falls back to title · badge when narrative line is absent', () => {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + 40);
    const trainingDayId = format(new Date(), 'yyyy-MM-dd');
    const targetDate = new Date();
    targetDate.setUTCDate(targetDate.getUTCDate() + 10);

    const anchor = buildTodayGoalAnchor({
      goals: [raceGoal({ id: 'g2', title: 'Hyrox', targetDate })],
      plannedSessions: [],
      trainingDayId,
      narrativeGoalLine: null,
    });

    expect(anchor?.goalId).toBe('g2');
    expect(anchor?.linkedToSession).toBe(false);
    expect(anchor?.href).toBe('/moi/objectifs#goal-g2');
    expect(anchor?.label).toMatch(/^Hyrox/);
    expect(anchor?.label).toMatch(/J-/);
  });
});
