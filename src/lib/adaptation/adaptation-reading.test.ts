import { describe, expect, it } from 'vitest';
import {
  explainLoadMultiplier,
  loadMultiplierDeltaPct,
  synthesizeAdaptationReading,
} from '@/lib/adaptation/adaptation-reading';

describe('loadMultiplierDeltaPct', () => {
  it('maps 1.08 → +8 %', () => {
    expect(loadMultiplierDeltaPct(1.08)).toBe(8);
  });
});

describe('explainLoadMultiplier', () => {
  it('explains an increase', () => {
    expect(explainLoadMultiplier(1.08)).toContain('+8');
    expect(explainLoadMultiplier(1.08)).toContain('1.08');
  });

  it('returns null at identity', () => {
    expect(explainLoadMultiplier(1)).toBeNull();
  });
});

describe('synthesizeAdaptationReading', () => {
  it('ties plateau + weak load progression to increase-load without restating the index', () => {
    const line = synthesizeAdaptationReading({
      verdictKey: 'INCREASE_LOAD',
      adaptationIndex: 44,
      trendLabel: 'Stable',
      statusLabel: 'Plateau',
      limitingFactor: 'Progression de charge',
      limitingScore: 29,
      plateauRisk: true,
      overreachingWithoutAdaptation: false,
      loadMultiplier: 1.08,
      historyLength: 28,
    });
    expect(line).not.toMatch(/Indice\s+44/);
    expect(line).toContain('29');
    expect(line.toLowerCase()).toMatch(/charge|plateau/);
    expect(line).toContain('1.08');
  });

  it('keeps sustain coaching without duplicating status label', () => {
    const line = synthesizeAdaptationReading({
      verdictKey: 'SUSTAIN',
      adaptationIndex: 58,
      trendLabel: 'Stable',
      statusLabel: 'Maintien',
      limitingFactor: null,
      limitingScore: null,
      plateauRisk: false,
      overreachingWithoutAdaptation: false,
      loadMultiplier: 1,
      historyLength: 28,
    });
    expect(line.toLowerCase()).toMatch(/trajectoire|maintenir/);
    expect(line).not.toMatch(/Indice\s+58/);
  });
});
