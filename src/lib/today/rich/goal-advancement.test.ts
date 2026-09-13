import { describe, expect, it } from 'vitest';
import {
  buildGoalAdvancement,
  buildGoalAdvancementLabNote,
} from '@/lib/today/rich/goal-advancement';
import { buildCoachingAdvancementEntry } from '@/lib/plan/coaching-advancement-ledger';
import type { PlanGoalView } from '@/lib/plan/trajectory/plan-goal';

const NOW = new Date(2026, 8, 12, 9, 0, 0);

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

function metricGoal(overrides: Partial<PlanGoalView> = {}): PlanGoalView {
  return {
    id: 'goal-metric',
    title: '5 km sous 20′',
    countdown: null,
    countdownCaption: null,
    detail: '21:10 / 20:00',
    progress: 42,
    targetDate: null,
    isRace: false,
    ...overrides,
  };
}

describe('buildGoalAdvancement', () => {
  it('returns null without a goal', () => {
    expect(
      buildGoalAdvancement({
        goal: null,
        weekDoneCount: 2,
        weekRemainingCount: 1,
        ledger: [],
        now: NOW,
        phaseLabel: null,
      }),
    ).toBeNull();
  });

  it('builds metric progress with coaching adapts', () => {
    const ledger = [
      buildCoachingAdvancementEntry({
        goalLabel: '5 km sous 20′',
        changeCount: 2,
        now: new Date(2026, 8, 10),
      }),
    ];
    const view = buildGoalAdvancement({
      goal: metricGoal(),
      weekDoneCount: 3,
      weekRemainingCount: 1,
      ledger,
      now: NOW,
      phaseLabel: null,
    });
    expect(view).not.toBeNull();
    expect(view?.eyebrow).toBe('Suivi');
    expect(view?.headline).toBe('42 % de la cible');
    expect(view?.why).toContain('2 séances adaptées');
    expect(view?.facts.map((f) => f.id)).toEqual(['adapted', 'done', 'remaining']);
    expect(view?.href).toContain('#goal-goal-metric');
  });

  it('builds race countdown with phase lab facts', () => {
    const view = buildGoalAdvancement({
      goal: raceGoal(),
      weekDoneCount: 0,
      weekRemainingCount: 0,
      ledger: [],
      now: NOW,
      phaseLabel: 'Build',
    });
    expect(view?.headline).toBe('J-28 · Sub 1h30');
    expect(view?.facts.map((f) => f.label)).toEqual(['Build']);
    expect(view?.why).toContain('phase Build');
  });

  it('hides when goal exists but no coaching or week facts', () => {
    const view = buildGoalAdvancement({
      goal: raceGoal(),
      weekDoneCount: 0,
      weekRemainingCount: 0,
      ledger: [],
      now: NOW,
      phaseLabel: null,
    });
    expect(view).toBeNull();
  });

  it('hides metric goal without facts (no emptyWhy noise)', () => {
    expect(
      buildGoalAdvancement({
        goal: metricGoal(),
        weekDoneCount: 0,
        weekRemainingCount: 0,
        ledger: [],
        now: NOW,
        phaseLabel: null,
      }),
    ).toBeNull();
  });

  it('lab-note joins headline and facts', () => {
    const view = buildGoalAdvancement({
      goal: metricGoal({ progress: 10 }),
      weekDoneCount: 1,
      weekRemainingCount: 0,
      ledger: [],
      now: NOW,
      phaseLabel: null,
    });
    expect(view).not.toBeNull();
    expect(buildGoalAdvancementLabNote(view!)).toBe('10 % de la cible · 1 faite');
  });
});
