import { describe, expect, it } from 'vitest';
import {
  clampReassessmentIndex,
  reassessmentChipLabel,
  reassessmentProgressLabel,
  reassessmentRemainingLabel,
} from '@sharpit/app/lib/physical-health/reassessment-pager';

describe('reassessment pager', () => {
  it('clamps index into range', () => {
    expect(clampReassessmentIndex(-1, 3)).toBe(0);
    expect(clampReassessmentIndex(9, 3)).toBe(2);
  });

  it('hides progress for a single injury', () => {
    expect(reassessmentProgressLabel(0, 1)).toBeNull();
    expect(reassessmentProgressLabel(0, 2)).toBe('1 / 2');
    expect(reassessmentRemainingLabel(1)).toBeNull();
    expect(reassessmentRemainingLabel(2)).toBe('2 restantes');
    expect(reassessmentRemainingLabel(3)).toBe('3 restantes');
  });

  it('strips category prefix from chip labels', () => {
    expect(reassessmentChipLabel('Douleur : Nerf sciatique')).toBe('Nerf sciatique');
    expect(reassessmentChipLabel('Blessure : Genou')).toBe('Genou');
    expect(reassessmentChipLabel('Nerf sciatique')).toBe('Nerf sciatique');
  });
});
