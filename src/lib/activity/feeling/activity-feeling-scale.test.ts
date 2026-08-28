import { describe, expect, it } from 'vitest';
import { ACTIVITY_FEELING_SCALE } from '@/lib/activity/feeling/activity-feeling-scale';

describe('ACTIVITY_FEELING_SCALE', () => {
  it('exposes five ordered options with hints', () => {
    expect(ACTIVITY_FEELING_SCALE).toHaveLength(5);
    expect(ACTIVITY_FEELING_SCALE.map((option) => option.value)).toEqual([
      'Très bien',
      'Bien',
      'Correct',
      'Mal',
      'Très mal',
    ]);
    for (const option of ACTIVITY_FEELING_SCALE) {
      expect(option.hint.length).toBeGreaterThan(8);
      expect(option.icon.length).toBeGreaterThan(0);
    }
  });
});
