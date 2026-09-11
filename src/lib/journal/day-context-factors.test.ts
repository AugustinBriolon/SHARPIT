import { describe, expect, it } from 'vitest';
import {
  formatDayContextFactorsNote,
  mergeWellnessNotesWithFactors,
  toggleDayContextFactor,
} from './day-context-factors';

describe('day-context-factors', () => {
  it('toggles factors without duplicates', () => {
    expect(toggleDayContextFactor([], 'coffee')).toEqual(['coffee']);
    expect(toggleDayContextFactor(['coffee'], 'coffee')).toEqual([]);
    expect(toggleDayContextFactor(['coffee'], 'mood_low')).toEqual(['coffee', 'mood_low']);
  });

  it('formats a coach-readable context line', () => {
    expect(formatDayContextFactorsNote(['coffee', 'hydration_low'])).toBe(
      'Contexte : Café · Hydratation',
    );
    expect(formatDayContextFactorsNote(['late_meal', 'device_in_bed'])).toBe(
      'Contexte : Repas tardif (nuit J-1→J) · Écran au lit (nuit J-1→J)',
    );
    expect(formatDayContextFactorsNote(['alcohol', 'creatine'])).toBe(
      'Contexte : Alcool · Créatine',
    );
    expect(formatDayContextFactorsNote([])).toBeNull();
  });

  it('merges free notes with context factors', () => {
    expect(mergeWellnessNotesWithFactors('Sommeil court', ['late_meal'])).toBe(
      'Sommeil court\nContexte : Repas tardif (nuit J-1→J)',
    );
    expect(mergeWellnessNotesWithFactors(null, ['mood_low'])).toBe('Contexte : Humeur basse');
    expect(mergeWellnessNotesWithFactors('  ok  ', [])).toBe('ok');
  });
});
