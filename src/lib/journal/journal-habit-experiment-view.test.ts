import { describe, expect, it } from 'vitest';
import type { EvaluatedExperiment } from '@/lib/journal/journal-habit-experiment';
import {
  splitExperimentViews,
  testedFactorIds,
  toHabitExperimentView,
} from '@/lib/journal/journal-habit-experiment-view';

function experiment(overrides: Partial<EvaluatedExperiment> = {}): EvaluatedExperiment {
  return {
    id: 'exp-1',
    factorId: 'alcohol',
    intent: 'REMOVE',
    startDayId: '2026-09-01',
    endDayId: '2026-09-07',
    reviewDayId: '2026-09-09',
    status: 'running',
    dayIndex: 5,
    segments: ['held', 'held', 'held', 'held', 'pending', 'pending', 'pending'],
    heldDays: 4,
    verdict: null,
    effects: [],
    ...overrides,
  };
}

describe('toHabitExperimentView', () => {
  it('shows a running test as a day count and its automatic review date', () => {
    const view = toHabitExperimentView(experiment());

    expect(view.title).toBe('Sans « Alcool »');
    expect(view.progressLabel).toBe('J5 / 7');
    expect(view.heldLabel).toBe('4 jours tenus');
    expect(view.reviewLabel).toBe('relecture le mer. 9 sept.');
    expect(view.verdictLabel).toBeNull();
  });

  it('reads a reviewed test in three states with its measured gaps', () => {
    const view = toHabitExperimentView(
      experiment({
        status: 'reviewed',
        verdict: 'worked',
        effects: [
          { outcome: 'sleepMinutes', delta: 18, nWindow: 7, nBaseline: 21, confidence: 'medium' },
          { outcome: 'recoveryScore', delta: 9, nWindow: 7, nBaseline: 21, confidence: 'none' },
        ],
      }),
    );

    expect(view.verdictLabel).toBe('a marché');
    expect(view.deltaLine).toBe('sommeil +18′ · récup +9 · 7 j contre 21');
  });

  it('gives an abandoned test no reading', () => {
    const view = toHabitExperimentView(experiment({ status: 'reviewed', verdict: 'abandoned' }));

    expect(view.verdictLabel).toBe('abandonné');
    expect(view.deltaLine).toBeNull();
  });
});

describe('testedFactorIds', () => {
  it('badges habits with a completed reading, not abandoned or running ones', () => {
    expect(
      testedFactorIds([
        experiment({ factorId: 'alcohol', status: 'reviewed', verdict: 'no_effect' }),
        experiment({ factorId: 'late_meal', status: 'reviewed', verdict: 'abandoned' }),
        experiment({ factorId: 'coffee' }),
      ]),
    ).toEqual(['alcohol']);
  });
});

describe('splitExperimentViews', () => {
  it('separates the running test from the reviewed history', () => {
    const running = toHabitExperimentView(experiment());
    const done = toHabitExperimentView(
      experiment({ id: 'exp-0', status: 'reviewed', verdict: 'worked' }),
    );

    expect(splitExperimentViews([running, done])).toEqual({ running, reviewed: [done] });
    expect(splitExperimentViews([done]).running).toBeNull();
  });
});
