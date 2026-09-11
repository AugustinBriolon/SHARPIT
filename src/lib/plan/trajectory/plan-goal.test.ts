import { GoalKind, GoalPriority } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import type { ClientGoal } from '@/lib/query/types';
import { selectPlanGoal } from './plan-goal';

/**
 * Dates are taken relative to an explicit clock: goal ranking filters expired
 * goals against `now`, so fixtures stay stable for a given instant.
 */
function inDays(days: number, now: Date): Date {
  const date = new Date(now);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function goal(partial: Partial<ClientGoal> & { id: string }, now: Date): ClientGoal {
  return {
    title: 'Objectif',
    kind: GoalKind.RACE,
    priority: GoalPriority.A,
    targetDate: inDays(30, now),
    raceFormat: null,
    targetPerformance: null,
    achieved: false,
    currentValue: null,
    targetValue: null,
    unit: null,
    metricKey: null,
    ...partial,
  } as ClientGoal;
}

describe('selectPlanGoal', () => {
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  it('returns nothing when no goal is active', () => {
    expect(selectPlanGoal([], now)).toBeNull();
  });

  it('keeps the A-priority race ahead of a metric goal', () => {
    const selected = selectPlanGoal(
      [
        goal({ id: 'metric', kind: GoalKind.METRIC, title: 'FTP 300 W', priority: null }, now),
        goal({ id: 'race', title: 'Embrunman' }, now),
      ],
      now,
    );

    expect(selected?.id).toBe('race');
    expect(selected?.isRace).toBe(true);
  });

  it('captions the countdown so J-30 needs no training literacy', () => {
    const selected = selectPlanGoal([goal({ id: 'race' }, now)], now);

    expect(selected?.countdown).toBe('J-30');
    expect(selected?.countdownCaption).toBe('jours restants');
  });

  it('says the race is today rather than counting zero days', () => {
    const selected = selectPlanGoal([goal({ id: 'race', targetDate: inDays(0, now) }, now)], now);

    expect(selected?.countdown).toBe('J-0');
    expect(selected?.countdownCaption).toBe("c'est aujourd'hui");
  });

  it('carries no countdown for a goal without a date', () => {
    const selected = selectPlanGoal([goal({ id: 'race', targetDate: null }, now)], now);

    expect(selected?.countdown).toBeNull();
    expect(selected?.countdownCaption).toBeNull();
    expect(selected?.targetDate).toBeNull();
  });

  it('describes a race by what it is chasing, then by its format', () => {
    const chasing = selectPlanGoal(
      [goal({ id: 'race', raceFormat: 'Half Ironman', targetPerformance: 'Sub 5h00' }, now)],
      now,
    );
    expect(chasing?.detail).toBe('Sub 5h00');

    const stated = selectPlanGoal([goal({ id: 'race', raceFormat: 'Half Ironman' }, now)], now);
    expect(stated?.detail).toBe('Half Ironman');
  });

  it('leaves a race without partial progress', () => {
    const selected = selectPlanGoal([goal({ id: 'race' }, now)], now);

    // A race is either run or not. A half-finished race is not a reading.
    expect(selected?.progress).toBeNull();
  });
});
