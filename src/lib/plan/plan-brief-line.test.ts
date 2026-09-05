import { describe, expect, it } from 'vitest';
import { briefHubLine } from '@/lib/plan/plan-brief-line';
import type { WeeklyCoachingBriefViewModel } from '@/core/presentation/weekly-coaching-brief-view-model';

function brief(partial: Partial<WeeklyCoachingBriefViewModel>): WeeklyCoachingBriefViewModel {
  return {
    weekStartLabel: 'lundi',
    weekEndLabel: 'dimanche',
    visible: true,
    planContext: null,
    goalContext: null,
    load: null,
    keySessions: [],
    recovery: null,
    limitingFactor: null,
    assumptions: [],
    dataGaps: [],
    whatWouldChange: [],
    learningFeedback: [],
    emptyState: null,
    ...partial,
  };
}

describe('briefHubLine', () => {
  it('prefers the first learning sentence', () => {
    expect(
      briefHubLine(
        brief({
          learningFeedback: [{ key: 'a', sentence: 'Le seuil a tenu.' }],
          planContext: {
            phaseLabel: 'Base',
            targetLoad: 300,
            isDeload: false,
            focus: null,
          },
        }),
      ),
    ).toBe('Le seuil a tenu.');
  });

  it('is silent when the brief is not visible', () => {
    expect(briefHubLine(brief({ visible: false }))).toBeNull();
  });

  it('does not fall back to the phase name when the brief has no learning line', () => {
    expect(
      briefHubLine(
        brief({
          planContext: {
            phaseLabel: 'Spécifique',
            targetLoad: 300,
            isDeload: false,
            focus: null,
          },
        }),
      ),
    ).toBeNull();
  });
});
