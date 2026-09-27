import { describe, expect, it } from 'vitest';
import { calorieAdherence } from '@sharpit/server/lib/nutrition/goal-adherence';

describe('calorieAdherence', () => {
  it('reads a day without a log as none', () => {
    expect(calorieAdherence(null, 2400)).toBe('none');
    expect(calorieAdherence(0, 2400)).toBe('none');
  });

  it('counts the exercise calories into the budget', () => {
    expect(calorieAdherence(2800, 2400, 450)).toBe('on_target');
    expect(calorieAdherence(2800, 2400)).toBe('over');
  });

  it('keeps ±10 % as on target', () => {
    expect(calorieAdherence(2160, 2400)).toBe('on_target');
    expect(calorieAdherence(2100, 2400)).toBe('under');
    expect(calorieAdherence(2650, 2400)).toBe('over');
  });

  it('treats a logged day without a goal as on target, having nothing to miss', () => {
    expect(calorieAdherence(1800, null)).toBe('on_target');
  });
});
