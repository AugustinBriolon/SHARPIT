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

  function metricWithAdapts() {
    return buildGoalAdvancement({
      goal: metricGoal(),
      weekDoneCount: 3,
      weekRemainingCount: 1,
      ledger: [
        buildCoachingAdvancementEntry({
          goalLabel: '5 km sous 20′',
          changeCount: 2,
          now: new Date(2026, 8, 10),
        }),
      ],
      now: NOW,
      phaseLabel: null,
    });
  }

  it('builds metric headline and coach why without recounting', () => {
    const view = metricWithAdapts();
    expect(view?.eyebrow).toBe('Plan vivant');
    expect(view?.headline).toBe('42 % de la cible');
    expect(view?.why).toBe('Ce que le coaching a déjà changé cette semaine.');
    expect(view?.why).not.toMatch(/\d+/);
    expect(view?.href).toContain('#goal-goal-metric');
  });

  it('builds week rail segments and coaching trail', () => {
    const view = metricWithAdapts();
    expect(view?.weekSegments.map((s) => s.id)).toEqual(['adapted', 'done', 'remaining']);
    expect(view?.weekSegments[0]).toMatchObject({
      tone: 'tension',
      dateLabel: '2',
      intensityLabel: 'séances adaptées',
    });
    expect(view?.trail[0]?.label).toMatch(/2 séances adaptées/);
    expect(view?.trail[0]?.label).toMatch(/vers 5 km sous 20′/);
  });

  it('still reads the countdown when the week is empty', () => {
    const view = buildGoalAdvancement({
      goal: raceGoal(),
      weekDoneCount: 0,
      weekRemainingCount: 0,
      ledger: [],
      now: NOW,
      phaseLabel: 'Build',
    });
    expect(view?.headline).toBe('J-28 · Sub 1h30');
    expect(view?.weekSegments).toEqual([]);
    expect(view?.why).toBe('Aucune séance planifiée cette semaine.');
  });

  it('puts phase in expand footer, not in rail', () => {
    const view = buildGoalAdvancement({
      goal: raceGoal(),
      weekDoneCount: 2,
      weekRemainingCount: 1,
      ledger: [],
      now: NOW,
      phaseLabel: 'Build',
    });
    expect(view?.headline).toBe('J-28 · Sub 1h30');
    expect(view?.why).toBe('Le Twin suit l’exécution de ta semaine.');
    expect(view?.weekSegments.map((s) => s.id)).toEqual(['done', 'remaining']);
    expect(view?.phaseLabel).toBe('Build');
    expect(view?.facts.map((f) => f.label)).not.toContain('Build');
  });

  it('keeps a metric goal readable on an empty week', () => {
    const view = buildGoalAdvancement({
      goal: metricGoal(),
      weekDoneCount: 0,
      weekRemainingCount: 0,
      ledger: [],
      now: NOW,
      phaseLabel: null,
    });
    expect(view?.headline).toBe('42 % de la cible');
    expect(view?.weekSegments).toEqual([]);
  });

  it('hides only when there is nothing to read at all', () => {
    // No countdown, no percentage, no week — an instrument with no reading.
    expect(
      buildGoalAdvancement({
        goal: raceGoal({ countdown: null, progress: null }),
        weekDoneCount: 0,
        weekRemainingCount: 0,
        ledger: [],
        now: NOW,
        phaseLabel: 'Build',
      }),
    ).toBeNull();
  });

  it('lab-note is coaching facts only (no headline / countdown / %)', () => {
    const view = buildGoalAdvancement({
      goal: metricGoal({ progress: 10 }),
      weekDoneCount: 1,
      weekRemainingCount: 0,
      ledger: [],
      now: NOW,
      phaseLabel: null,
    });
    expect(view).not.toBeNull();
    expect(buildGoalAdvancementLabNote(view!)).toBe('1 faite');
    expect(buildGoalAdvancementLabNote(view!)).not.toContain('%');
  });

  it('lab-note joins adapted + done + remaining without hero', () => {
    const ledger = [
      buildCoachingAdvancementEntry({
        goalLabel: 'Semi Paris',
        changeCount: 2,
        now: new Date(2026, 8, 10),
      }),
    ];
    const view = buildGoalAdvancement({
      goal: raceGoal(),
      weekDoneCount: 3,
      weekRemainingCount: 1,
      ledger,
      now: NOW,
      phaseLabel: 'Build',
    });
    expect(buildGoalAdvancementLabNote(view!)).toBe('2 séances adaptées · 3 faites · 1 restante');
  });
});
