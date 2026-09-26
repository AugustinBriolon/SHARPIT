import { describe, expect, it } from 'vitest';
import { ACTIVITY_FEELING_SCALE } from '@sharpit/app/lib/activity/feeling/activity-feeling-scale';

describe('ACTIVITY_FEELING_SCALE', () => {
  it('exposes five ordered options with hints', () => {
    expect(ACTIVITY_FEELING_SCALE).toHaveLength(5);
    expect(ACTIVITY_FEELING_SCALE.map((option) => option.value)).toEqual([
      'Très mal',
      'Mal',
      'Correct',
      'Bien',
      'Très bien',
    ]);
    for (const option of ACTIVITY_FEELING_SCALE) {
      expect(option.hint.length).toBeGreaterThan(8);
    }
  });

  // Emoji faces are decorative and consumer-fitness DNA — the picker renders the
  // ordinal and reads the hint back instead (DESIGN_LANGUAGE §11.1).
  it('carries no icon field', () => {
    for (const option of ACTIVITY_FEELING_SCALE) {
      expect(option).not.toHaveProperty('icon');
    }
  });
});
