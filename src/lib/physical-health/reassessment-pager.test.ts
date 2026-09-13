import { describe, expect, it } from 'vitest';
import {
  clampReassessmentIndex,
  reassessmentIndexFromSlider,
  reassessmentProgressLabel,
  reassessmentSliderValue,
} from '@/lib/physical-health/reassessment-pager';

describe('reassessment pager', () => {
  it('clamps index into range', () => {
    expect(clampReassessmentIndex(-1, 3)).toBe(0);
    expect(clampReassessmentIndex(9, 3)).toBe(2);
  });

  it('hides progress for a single injury', () => {
    expect(reassessmentProgressLabel(0, 1)).toBeNull();
    expect(reassessmentProgressLabel(0, 2)).toBe('1 / 2');
  });

  it('maps slider fraction to index and back', () => {
    expect(reassessmentSliderValue(0, 3)).toBe(0);
    expect(reassessmentSliderValue(2, 3)).toBe(1);
    expect(reassessmentIndexFromSlider(0.5, 3)).toBe(1);
    expect(reassessmentIndexFromSlider(1, 3)).toBe(2);
  });
});
