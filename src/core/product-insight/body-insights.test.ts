import { describe, expect, it } from 'vitest';
import { buildBodyInsightBundle } from './body-insights';

const BASE_INPUT = {
  latestWeightKg: 82.5,
  weightDelta7d: 0.7,
  bodyFatDelta7d: -0.3,
  waterPercent: 55,
  visceralFat: 8,
  sourceLabel: 'Withings',
  measuredAtLabel: '6 juil. 2026, 15:51',
};

describe('buildBodyInsightBundle', () => {
  it('never repeats the same string as both title and summary on any insight', () => {
    const bundle = buildBodyInsightBundle(BASE_INPUT);
    const all = [...bundle.primary, ...bundle.supporting, ...bundle.contextual];

    expect(all.length).toBeGreaterThan(0);
    for (const insight of all) {
      expect(insight.title).not.toBe(insight.summary);
    }
  });

  it('titles the trajectory insight with the specific finding, not the generic category', () => {
    const bundle = buildBodyInsightBundle(BASE_INPUT);
    const trajectory = bundle.primary.find((i) => i.id === 'body:trajectory');

    expect(trajectory?.title).toBe('Dérive à la hausse');
    expect(trajectory?.summary).toBe('Trajectoire corporelle');
  });

  it('titles the hydration insight with the specific reading, not a generic label', () => {
    const bundle = buildBodyInsightBundle(BASE_INPUT);
    const hydration = bundle.supporting.find((i) => i.id === 'body:hydration-context');

    expect(hydration?.title).toBe('Aucun signal fort de biais hydrique');
    expect(hydration?.summary).toBe('Contexte de mesure');
  });
});
