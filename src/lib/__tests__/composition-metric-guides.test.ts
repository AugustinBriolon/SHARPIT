import { describe, expect, it } from 'vitest';
import { COMPOSITION_METRIC_GUIDES } from '@/lib/composition-metric-guides';

describe('composition metric guides', () => {
  it('classifies BMI in normal range', () => {
    const result = COMPOSITION_METRIC_GUIDES.bmi.interpret(24.1, {
      heightM: 1.84,
      weightKg: 82,
      chronologicalAgeYears: null,
    });
    expect(result.zoneLabel).toBe('Normal');
    expect(result.tone).toBe('good');
  });

  it('compares vascular age to chronological age', () => {
    const result = COMPOSITION_METRIC_GUIDES.vascularAgeYears.interpret(42, {
      heightM: null,
      weightKg: null,
      chronologicalAgeYears: 35,
    });
    expect(result.personalizedNote).toContain('supérieur');
  });
});
