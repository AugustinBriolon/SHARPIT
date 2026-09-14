import { describe, expect, it } from 'vitest';
import {
  buildGoalAdvancement,
  buildGoalAdvancementLabNote,
  type GoalAdvancementWeekDayInput,
} from '@/lib/today/rich/goal-advancement';
import { buildCoachingAdvancementEntry } from '@/lib/plan/coaching-advancement-ledger';
import type { PlanGoalView } from '@/lib/plan/trajectory/plan-goal';

const NOW = new Date(2026, 8, 12, 9, 0, 0); // Saturday

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

/** Mon 7 Sep → Sun 13 Sep 2026 around NOW (Sat 12). */
function sampleWeekDays(
  overrides: Partial<Record<string, GoalAdvancementWeekDayInput['state']>> = {},
): GoalAdvancementWeekDayInput[] {
  const monday = new Date(2026, 8, 7);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index);
    const dayKey = `2026-09-${String(7 + index).padStart(2, '0')}`;
    return {
      dayKey,
      date,
      state: overrides[dayKey] ?? 'rest',
      isToday: index === 5,
    };
  });
}

const base = {
  weekDays: [] as GoalAdvancementWeekDayInput[],
  ledger: [] as ReturnType<typeof buildCoachingAdvancementEntry>[],
  now: NOW,
  phaseLabel: null as string | null,
};

describe('buildGoalAdvancement', () => {
  it('returns null without a goal', () => {
    expect(
      buildGoalAdvancement({
        ...base,
        goal: null,
        weekDoneCount: 2,
        weekRemainingCount: 1,
      }),
    ).toBeNull();
  });

  function metricWithAdapts() {
    return buildGoalAdvancement({
      ...base,
      goal: metricGoal(),
      weekDoneCount: 3,
      weekRemainingCount: 1,
      weekDays: sampleWeekDays({
        '2026-09-08': 'done',
        '2026-09-10': 'done',
        '2026-09-11': 'done',
        '2026-09-13': 'planned',
      }),
      ledger: [
        buildCoachingAdvancementEntry({
          goalLabel: '5 km sous 20′',
          changeCount: 2,
          now: new Date(2026, 8, 10),
        }),
      ],
    });
  }

  it('builds metric headline, actionable why, and goal CTA', () => {
    const view = metricWithAdapts();
    expect(view?.eyebrow).toBe('Plan vivant');
    expect(view?.headline).toBe('42 % de la cible');
    expect(view?.why).toBe('2 séances adaptées cette semaine.');
    expect(view?.href).toBe('/moi/objectifs#goal-goal-metric');
    expect(view?.ctaLabel).toBe('Voir l’objectif');
  });

  it('lays out the seven week days and marks today', () => {
    const view = metricWithAdapts();
    expect(view?.weekDays).toHaveLength(7);
    expect(view?.weekDays.filter((day) => day.state === 'done')).toHaveLength(3);
    expect(view?.weekDays.find((day) => day.isToday)?.dayOfMonth).toBe(12);
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
      ...base,
      goal: raceGoal(),
      weekDoneCount: 0,
      weekRemainingCount: 0,
      phaseLabel: 'Build',
    });
    expect(view?.headline).toBe('J-28 · Sub 1h30');
    expect(view?.weekSegments).toEqual([]);
    expect(view?.why).toBe('Aucune séance planifiée cette semaine.');
  });

  it('names remaining dues when Twin is only tracking execution', () => {
    const view = buildGoalAdvancement({
      ...base,
      goal: raceGoal(),
      weekDoneCount: 2,
      weekRemainingCount: 1,
      weekDays: sampleWeekDays({
        '2026-09-08': 'done',
        '2026-09-10': 'done',
        '2026-09-13': 'planned',
      }),
      phaseLabel: 'Build',
    });
    expect(view?.headline).toBe('J-28 · Sub 1h30');
    expect(view?.why).toBe('1 séance encore due cette semaine.');
    expect(view?.weekSegments.map((s) => s.id)).toEqual(['done', 'remaining']);
    expect(view?.phaseLabel).toBe('Build');
    expect(view?.facts.map((f) => f.label)).not.toContain('Build');
  });

  it('keeps a metric goal readable on an empty week', () => {
    const view = buildGoalAdvancement({
      ...base,
      goal: metricGoal(),
      weekDoneCount: 0,
      weekRemainingCount: 0,
    });
    expect(view?.headline).toBe('42 % de la cible');
    expect(view?.weekSegments).toEqual([]);
  });

  it('hides only when there is nothing to read at all', () => {
    expect(
      buildGoalAdvancement({
        ...base,
        goal: raceGoal({ countdown: null, progress: null }),
        weekDoneCount: 0,
        weekRemainingCount: 0,
        phaseLabel: 'Build',
      }),
    ).toBeNull();
  });

  it('lab-note is coaching facts only (no headline / countdown / %)', () => {
    const view = buildGoalAdvancement({
      ...base,
      goal: metricGoal({ progress: 10 }),
      weekDoneCount: 1,
      weekRemainingCount: 0,
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
      ...base,
      goal: raceGoal(),
      weekDoneCount: 3,
      weekRemainingCount: 1,
      ledger,
      phaseLabel: 'Build',
    });
    expect(buildGoalAdvancementLabNote(view!)).toBe('2 séances adaptées · 3 faites · 1 restante');
  });
});
